import { prisma } from "../lib/prisma";
import { sendTelegramMessage } from "./telegram";

// --- Helpers ---

function userToday(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Get the UTC instant corresponding to midnight of the given date string
 * in the given timezone.
 */
function tzMidnight(dateStr: string, timezone: string): Date {
  const probe = new Date(dateStr + "T12:00:00Z");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(probe);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0");

  const tzHour = get("hour");
  const tzMinute = get("minute");
  const offsetMs = (tzHour * 60 + tzMinute - 12 * 60) * 60 * 1000;

  const midnight = new Date(dateStr + "T00:00:00Z");
  return new Date(midnight.getTime() - offsetMs);
}

/**
 * Get the UTC day boundaries (start, end) for a date string in a timezone.
 */
function dayBoundsUtc(dateStr: string, timezone: string): { dayStart: Date; dayEnd: Date } {
  const dayStart = tzMidnight(dateStr, timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
}

function isBirthdayInRange(
  birthday: Date,
  todayStr: string,
  daysAhead: number
): string | null {
  const today = new Date(todayStr);
  for (let d = 0; d <= daysAhead; d++) {
    const check = new Date(today);
    check.setDate(check.getDate() + d);
    const checkMD = `${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
    const bdayMD = `${String(birthday.getMonth() + 1).padStart(2, "0")}-${String(birthday.getDate()).padStart(2, "0")}`;
    if (checkMD === bdayMD) return toDateKey(check);
  }
  return null;
}

function daysUntil(todayStr: string, targetDateStr: string): number {
  const today = new Date(todayStr);
  const target = new Date(targetDateStr);
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

// --- Generators ---

export async function generateBirthdayReminders(): Promise<number> {
  const users = await prisma.user.findMany();
  let created = 0;

  for (const user of users) {
    const todayStr = userToday(user.timezone);

    // Person birthdays
    const people = await prisma.person.findMany({
      where: { userId: user.id, birthday: { not: null } },
    });

    for (const person of people) {
      const matchDate = isBirthdayInRange(person.birthday!, todayStr, 7);
      if (!matchDate) continue;

      const scheduledAt = new Date(matchDate + "T09:00:00Z");

      const existing = await prisma.reminder.findFirst({
        where: {
          userId: user.id,
          type: "BIRTHDAY",
          personId: person.id,
          scheduledAt,
        },
      });
      if (existing) continue;

      const days = daysUntil(todayStr, matchDate);
      const when =
        days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;

      await prisma.reminder.create({
        data: {
          userId: user.id,
          type: "BIRTHDAY",
          title: `${person.name}'s birthday ${when}!`,
          message: `${person.name}'s birthday is ${when} (${new Date(person.birthday!).toLocaleDateString("en-US", { month: "long", day: "numeric" })}).`,
          scheduledAt,
          personId: person.id,
        },
      });
      created++;
    }

    // Kid birthdays
    const kids = await prisma.kid.findMany({
      where: { userId: user.id, birthday: { not: null } },
    });

    for (const kid of kids) {
      const matchDate = isBirthdayInRange(kid.birthday!, todayStr, 7);
      if (!matchDate) continue;

      const scheduledAt = new Date(matchDate + "T09:00:00Z");

      const existing = await prisma.reminder.findFirst({
        where: {
          userId: user.id,
          type: "BIRTHDAY",
          kidId: kid.id,
          scheduledAt,
        },
      });
      if (existing) continue;

      const days = daysUntil(todayStr, matchDate);
      const when =
        days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;

      await prisma.reminder.create({
        data: {
          userId: user.id,
          type: "BIRTHDAY",
          title: `${kid.name}'s birthday ${when}!`,
          message: `${kid.name}'s birthday is ${when} (${new Date(kid.birthday!).toLocaleDateString("en-US", { month: "long", day: "numeric" })}).`,
          scheduledAt,
          kidId: kid.id,
        },
      });
      created++;
    }
  }

  return created;
}

export async function generateFollowUpReminders(): Promise<number> {
  const users = await prisma.user.findMany();
  let created = 0;

  for (const user of users) {
    const todayStr = userToday(user.timezone);
    const todayDate = new Date(todayStr);

    const people = await prisma.person.findMany({
      where: { userId: user.id, followUpDays: { not: null } },
    });

    for (const person of people) {
      const followUpDays = person.followUpDays!;
      let overdue = false;

      if (!person.lastContactAt) {
        overdue = true;
      } else {
        const daysSince = Math.floor(
          (todayDate.getTime() - person.lastContactAt.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        overdue = daysSince >= followUpDays;
      }
      if (!overdue) continue;

      const scheduledAt = new Date(todayStr + "T10:00:00Z");

      const existing = await prisma.reminder.findFirst({
        where: {
          userId: user.id,
          type: "FOLLOW_UP",
          personId: person.id,
          scheduledAt,
        },
      });
      if (existing) continue;

      const lastStr = person.lastContactAt
        ? person.lastContactAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "never";

      await prisma.reminder.create({
        data: {
          userId: user.id,
          type: "FOLLOW_UP",
          title: `Follow up with ${person.name}`,
          message: `It's been a while since you contacted ${person.name} (last: ${lastStr}). Time to catch up!`,
          scheduledAt,
          personId: person.id,
        },
      });
      created++;
    }
  }

  return created;
}

export async function generateMorningBriefings(): Promise<number> {
  const users = await prisma.user.findMany();
  let created = 0;

  for (const user of users) {
    const todayDate = userToday(user.timezone);
    const scheduledAt = new Date(todayDate + "T06:00:00Z");

    const existing = await prisma.reminder.findFirst({
      where: {
        userId: user.id,
        type: "MORNING_BRIEFING",
        scheduledAt,
      },
    });
    if (existing) continue;

    const { dayStart, dayEnd } = dayBoundsUtc(todayDate, user.timezone);

    // Gather data
    const [events, tasks, birthdays] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          calendar: { userId: user.id, isActive: true },
          startTime: { gte: dayStart, lt: dayEnd },
        },
        orderBy: { startTime: "asc" },
        take: 20,
      }),
      prisma.task.findMany({
        where: {
          userId: user.id,
          status: { in: ["TODO", "IN_PROGRESS"] },
          OR: [
            { dueDate: { gte: dayStart, lt: dayEnd } },
            { scheduledStart: { gte: dayStart, lt: dayEnd } },
          ],
        },
        orderBy: { priority: "desc" },
      }),
      prisma.reminder.findMany({
        where: {
          userId: user.id,
          type: "BIRTHDAY",
          scheduledAt: { gte: dayStart, lt: dayEnd },
        },
      }),
    ]);

    const lines: string[] = [];

    if (events.length > 0) {
      lines.push("<b>Calendar</b>");
      for (const e of events) {
        const time = e.allDay
          ? "All day"
          : new Date(e.startTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: user.timezone,
            });
        lines.push(`  ${time} - ${e.title}`);
      }
    }

    if (tasks.length > 0) {
      lines.push(lines.length ? "" : "");
      lines.push("<b>Tasks Due</b>");
      for (const t of tasks) {
        lines.push(`  [${t.priority}] ${t.title}`);
      }
    }

    if (birthdays.length > 0) {
      lines.push(lines.length ? "" : "");
      lines.push("<b>Birthdays</b>");
      for (const b of birthdays) {
        lines.push(`  ${b.title}`);
      }
    }

    if (lines.length === 0) {
      lines.push("Nothing scheduled today. Enjoy your free day!");
    }

    await prisma.reminder.create({
      data: {
        userId: user.id,
        type: "MORNING_BRIEFING",
        title: `Good morning! Here's your day`,
        message: lines.join("\n"),
        scheduledAt,
      },
    });
    created++;
  }

  return created;
}

export async function generateEveningReviews(): Promise<number> {
  const users = await prisma.user.findMany();
  let created = 0;

  for (const user of users) {
    const todayDate = userToday(user.timezone);
    const scheduledAt = new Date(todayDate + "T20:00:00Z");

    const existing = await prisma.reminder.findFirst({
      where: {
        userId: user.id,
        type: "EVENING_REVIEW",
        scheduledAt,
      },
    });
    if (existing) continue;

    const { dayStart, dayEnd } = dayBoundsUtc(todayDate, user.timezone);

    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = toDateKey(tomorrowDate);
    const { dayStart: tomorrowStart, dayEnd: tomorrowEnd } = dayBoundsUtc(tomorrowStr, user.timezone);

    const [completedToday, incompleteToday, tomorrowEvents] = await Promise.all(
      [
        prisma.task.findMany({
          where: {
            userId: user.id,
            status: "DONE",
            completedAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        prisma.task.findMany({
          where: {
            userId: user.id,
            status: { in: ["TODO", "IN_PROGRESS"] },
            OR: [
              { dueDate: { gte: dayStart, lt: dayEnd } },
              { scheduledStart: { gte: dayStart, lt: dayEnd } },
            ],
          },
        }),
        prisma.calendarEvent.findMany({
          where: {
            calendar: { userId: user.id, isActive: true },
            startTime: { gte: tomorrowStart, lt: tomorrowEnd },
          },
          orderBy: { startTime: "asc" },
          take: 10,
        }),
      ]
    );

    const lines: string[] = [];

    if (completedToday.length > 0) {
      lines.push(`<b>Completed Today (${completedToday.length})</b>`);
      for (const t of completedToday) {
        lines.push(`  \u2713 ${t.title}`);
      }
    }

    if (incompleteToday.length > 0) {
      lines.push(lines.length ? "" : "");
      lines.push(`<b>Still Due Today (${incompleteToday.length})</b>`);
      for (const t of incompleteToday) {
        lines.push(`  \u2022 ${t.title}`);
      }
    }

    if (tomorrowEvents.length > 0) {
      lines.push(lines.length ? "" : "");
      lines.push("<b>Tomorrow</b>");
      for (const e of tomorrowEvents) {
        const time = e.allDay
          ? "All day"
          : new Date(e.startTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: user.timezone,
            });
        lines.push(`  ${time} - ${e.title}`);
      }
    }

    if (lines.length === 0) {
      lines.push("All clear today! Nothing pending and a free tomorrow.");
    }

    await prisma.reminder.create({
      data: {
        userId: user.id,
        type: "EVENING_REVIEW",
        title: `Evening review`,
        message: lines.join("\n"),
        scheduledAt,
      },
    });
    created++;
  }

  return created;
}

// --- Delivery ---

export async function deliverPendingReminders(): Promise<number> {
  const now = new Date();
  const pending = await prisma.reminder.findMany({
    where: {
      scheduledAt: { lte: now },
      sentAt: null,
    },
    include: { user: true },
  });

  let delivered = 0;

  for (const reminder of pending) {
    if (!reminder.user.telegramChatId) continue;

    const text = `<b>${reminder.title}</b>\n\n${reminder.message || ""}`;
    const sent = await sendTelegramMessage(reminder.user.telegramChatId, text);

    if (sent) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { sentAt: new Date() },
      });
      delivered++;
    }
  }

  return delivered;
}
