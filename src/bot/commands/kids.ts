import type { Context } from "grammy";
import type { User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { CommandRoute } from "../dispatcher";
import { getDayRange, getWeekRange } from "../helpers/date-parser";
import {
  formatEvent,
  escapeHtml,
  truncate,
  shortId,
} from "../helpers/format";
import { kidsListKeyboard, kidScheduleKeyboard } from "../helpers/keyboards";

export async function findKidByShortId(userId: string, sid: string) {
  const kids = await prisma.kid.findMany({
    where: {
      userId,
      id: { endsWith: sid },
    },
  });
  return kids.length === 1 ? kids[0] : null;
}

export async function buildKidsWeek(
  userId: string,
  timezone: string
): Promise<{ text: string; kids: Awaited<ReturnType<typeof prisma.kid.findMany>> }> {
  const kids = await prisma.kid.findMany({
    where: { userId },
  });

  if (kids.length === 0) {
    return { text: 'No kids added yet. Use <code>kid add [name]</code>', kids: [] };
  }

  const { start, end } = getWeekRange(new Date(), timezone);
  const events = await prisma.calendarEvent.findMany({
    where: {
      kidId: { in: kids.map((k) => k.id) },
      startTime: { gte: start, lt: end },
    },
    include: { kid: true },
    orderBy: { startTime: "asc" },
  });

  if (events.length === 0) {
    return { text: "No kids' events this week.", kids };
  }

  const lines: string[] = ["<b>Kids' Events This Week</b>\n"];
  const grouped = new Map<string, typeof events>();
  for (const e of events) {
    const kidName = e.kid?.name || "Unknown";
    if (!grouped.has(kidName)) grouped.set(kidName, []);
    grouped.get(kidName)!.push(e);
  }

  for (const [kidName, kidEvents] of grouped) {
    lines.push(`<b>${escapeHtml(kidName)}</b>`);
    for (const e of kidEvents) {
      lines.push(formatEvent(e, timezone));
    }
    lines.push("");
  }

  return { text: lines.join("\n"), kids };
}

export async function buildKidSchedule(
  kidId: string,
  kidName: string,
  period: string,
  timezone: string
): Promise<string> {
  let start: Date;
  let end: Date;
  if (period === "week") {
    const range = getWeekRange(new Date(), timezone);
    start = range.start;
    end = range.end;
  } else {
    const ref = period === "tomorrow" || period === "tmrw"
      ? new Date(Date.now() + 86400000)
      : new Date();
    const range = getDayRange(ref, timezone);
    start = range.start;
    end = range.end;
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      kidId,
      startTime: { gte: start, lt: end },
    },
    orderBy: { startTime: "asc" },
  });

  const label = period === "tmrw" ? "tomorrow" : period;

  if (events.length === 0) {
    return `No events for <b>${escapeHtml(kidName)}</b> (${label}).`;
  }

  const lines = [`<b>${escapeHtml(kidName)} \u2014 ${label}</b>\n`];
  for (const e of events) {
    lines.push(formatEvent(e, timezone));
  }

  return lines.join("\n");
}

async function handleKidsWeek(ctx: Context, user: User) {
  const { text, kids } = await buildKidsWeek(user.id, user.timezone);
  await ctx.reply(truncate(text), {
    parse_mode: "HTML",
    reply_markup: kids.length > 0 ? kidsListKeyboard(kids) : undefined,
  });
}

async function handleKidAdd(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const name = match[1].trim();
  if (!name) {
    await ctx.reply("Usage: <code>kid add [name]</code>", {
      parse_mode: "HTML",
    });
    return;
  }

  const kid = await prisma.kid.create({
    data: {
      userId: user.id,
      name,
      keywords: [name.toLowerCase()],
    },
  });

  await ctx.reply(
    `Added kid: <b>${escapeHtml(kid.name)}</b> <code>${shortId(kid.id)}</code>\nKeyword "${kid.name.toLowerCase()}" will auto-tag calendar events.`,
    { parse_mode: "HTML" }
  );
}

async function handleKidSchedule(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const kidName = match[1].trim();
  const period = match[2].toLowerCase();

  const kid = await prisma.kid.findFirst({
    where: {
      userId: user.id,
      name: { contains: kidName, mode: "insensitive" },
    },
  });

  if (!kid) {
    return; // Not a kid name — let dispatch continue
  }

  const text = await buildKidSchedule(kid.id, kid.name, period, user.timezone);
  await ctx.reply(truncate(text), {
    parse_mode: "HTML",
    reply_markup: kidScheduleKeyboard(shortId(kid.id)),
  });
}

// This handler needs special treatment — it's ambiguous, so we verify
// the kid exists before handling. Return without reply if no match.
async function handleKidScheduleGuarded(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const kidName = match[1].trim();
  const kid = await prisma.kid.findFirst({
    where: {
      userId: user.id,
      name: { contains: kidName, mode: "insensitive" },
    },
  });

  if (!kid) {
    // Not a kid name. Since this is a catch-all pattern, reply with help.
    await ctx.reply(
      `Unknown command. Type <code>/help</code> for available commands.`,
      { parse_mode: "HTML" }
    );
    return;
  }

  await handleKidSchedule(ctx, user, match);
}

export const kidsRoutes: CommandRoute[] = [
  {
    pattern: /^kids$/i,
    handler: (ctx, user, _m) => handleKidsWeek(ctx, user),
    description: "kids — All kids' events this week",
  },
  {
    pattern: /^kid\s+add\s+(.+)$/i,
    handler: handleKidAdd,
    description: "kid add [name] — Add a kid",
  },
  {
    pattern: /^(\S+)\s+(today|tomorrow|week)$/i,
    handler: handleKidScheduleGuarded,
    description: "[kidname] today/tomorrow/week — Kid's schedule",
  },
];
