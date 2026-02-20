import type { Context } from "grammy";
import type { User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { CommandRoute } from "../dispatcher";
import {
  getDayRange,
  getWeekRange,
  parseDayName,
} from "../helpers/date-parser";
import {
  formatDaySchedule,
  formatEvent,
  truncate,
  escapeHtml,
} from "../helpers/format";
import {
  scheduleNavKeyboard,
  weekNavKeyboard,
  freeSlotsKeyboard,
} from "../helpers/keyboards";

export async function queryDayData(userId: string, start: Date, end: Date) {
  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        calendar: { userId, isActive: true },
        startTime: { gte: start, lt: end },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        OR: [
          { dueDate: { gte: start, lt: end } },
          { scheduledStart: { gte: start, lt: end } },
        ],
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  return { events, tasks };
}

export async function buildDaySchedule(
  userId: string,
  targetDate: Date,
  timezone: string
): Promise<{ text: string; dateStr: string }> {
  const { start, end } = getDayRange(targetDate, timezone);
  const { events, tasks } = await queryDayData(userId, start, end);
  const text = formatDaySchedule(targetDate, events, tasks, timezone);
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(targetDate);
  return { text, dateStr };
}

export async function buildWeekSchedule(
  userId: string,
  timezone: string
): Promise<string> {
  const { start, end } = getWeekRange(new Date(), timezone);
  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        calendar: { userId, isActive: true },
        startTime: { gte: start, lt: end },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        OR: [
          { dueDate: { gte: start, lt: end } },
          { scheduledStart: { gte: start, lt: end } },
        ],
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const lines: string[] = ["<b>This Week</b>\n"];
  for (let d = 0; d < 7; d++) {
    const day = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);

    const dayEvents = events.filter(
      (e) => e.startTime >= day && e.startTime < dayEnd
    );
    const dayTasks = tasks.filter((t) => {
      const ref = t.dueDate || t.scheduledStart;
      return ref && ref >= day && ref < dayEnd;
    });

    lines.push(formatDaySchedule(day, dayEvents, dayTasks, timezone));
    lines.push("");
  }

  return lines.join("\n");
}

export async function buildFreeSlots(
  userId: string,
  timezone: string
): Promise<string> {
  const { start, end } = getDayRange(new Date(), timezone);
  const events = await prisma.calendarEvent.findMany({
    where: {
      calendar: { userId, isActive: true },
      startTime: { gte: start, lt: end },
      allDay: false,
    },
    orderBy: { startTime: "asc" },
  });

  const workStart = new Date(start.getTime() + 8 * 60 * 60 * 1000);
  const workEnd = new Date(start.getTime() + 18 * 60 * 60 * 1000);

  const now = new Date();
  const slotStart = now > workStart ? now : workStart;

  const timeStr = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });

  const gaps: { from: Date; to: Date }[] = [];
  let cursor = slotStart;

  for (const event of events) {
    if (event.endTime <= cursor) continue;
    if (event.startTime >= workEnd) break;
    const eventStart = event.startTime > cursor ? event.startTime : cursor;
    if (eventStart > cursor) {
      gaps.push({ from: cursor, to: eventStart });
    }
    cursor = event.endTime > cursor ? event.endTime : cursor;
  }
  if (cursor < workEnd) {
    gaps.push({ from: cursor, to: workEnd });
  }

  if (gaps.length === 0) {
    return "No free slots today (8:00-18:00).";
  }

  const lines = ["<b>Free Slots Today</b>\n"];
  for (const gap of gaps) {
    const mins = Math.round(
      (gap.to.getTime() - gap.from.getTime()) / 60000
    );
    lines.push(`  ${timeStr(gap.from)} - ${timeStr(gap.to)} (${mins}m)`);
  }

  return lines.join("\n");
}

async function handleToday(ctx: Context, user: User) {
  const { text, dateStr } = await buildDaySchedule(user.id, new Date(), user.timezone);
  await ctx.reply(truncate(text), {
    parse_mode: "HTML",
    reply_markup: scheduleNavKeyboard(dateStr),
  });
}

async function handleTomorrow(ctx: Context, user: User) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { text, dateStr } = await buildDaySchedule(user.id, tomorrow, user.timezone);
  await ctx.reply(truncate(text), {
    parse_mode: "HTML",
    reply_markup: scheduleNavKeyboard(dateStr),
  });
}

async function handleWeek(ctx: Context, user: User) {
  const text = await buildWeekSchedule(user.id, user.timezone);
  await ctx.reply(truncate(text), {
    parse_mode: "HTML",
    reply_markup: weekNavKeyboard(),
  });
}

async function handleFree(ctx: Context, user: User) {
  const text = await buildFreeSlots(user.id, user.timezone);
  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: freeSlotsKeyboard(),
  });
}

async function handleDayName(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const dayName = match[0].trim();
  const target = parseDayName(dayName);
  if (!target) {
    await ctx.reply(`Could not parse day: ${escapeHtml(dayName)}`, {
      parse_mode: "HTML",
    });
    return;
  }
  const { text, dateStr } = await buildDaySchedule(user.id, target, user.timezone);
  await ctx.reply(truncate(text), {
    parse_mode: "HTML",
    reply_markup: scheduleNavKeyboard(dateStr),
  });
}

export const scheduleRoutes: CommandRoute[] = [
  {
    pattern: /^today$/i,
    handler: (ctx, user, _m) => handleToday(ctx, user),
    description: "today — Today's schedule",
  },
  {
    pattern: /^tomorrow$/i,
    handler: (ctx, user, _m) => handleTomorrow(ctx, user),
    description: "tomorrow — Tomorrow's schedule",
  },
  {
    pattern: /^week$/i,
    handler: (ctx, user, _m) => handleWeek(ctx, user),
    description: "week — Week overview",
  },
  {
    pattern: /^free$/i,
    handler: (ctx, user, _m) => handleFree(ctx, user),
    description: "free — Free time slots today",
  },
  {
    pattern: /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
    handler: handleDayName,
    description: "monday..sunday — Specific day's schedule",
  },
];
