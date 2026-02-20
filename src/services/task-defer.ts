import { prisma } from "../lib/prisma";

/**
 * Get the start of "today" in a given timezone as a UTC Date.
 */
function startOfTodayInTz(timezone: string): Date {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
  }).format(new Date());
  // dateStr = "YYYY-MM-DD" in user's local time

  // Find UTC offset for that timezone at noon
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
 * Defers overdue tasks: shifts scheduledStart/scheduledEnd forward by 1 day
 * for incomplete tasks whose scheduledEnd is before the start of today
 * in each user's timezone.
 */
export async function deferOverdueTasks(): Promise<number> {
  const users = await prisma.user.findMany({
    select: { id: true, timezone: true },
  });

  let total = 0;

  for (const user of users) {
    const userToday = startOfTodayInTz(user.timezone);

    const overdue = await prisma.task.findMany({
      where: {
        userId: user.id,
        status: { in: ["TODO", "IN_PROGRESS"] },
        scheduledEnd: { lt: userToday },
      },
    });

    if (overdue.length === 0) continue;

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const updates = overdue.map((task) => {
      const data: Record<string, Date> = {};

      if (task.scheduledStart) {
        data.scheduledStart = new Date(task.scheduledStart.getTime() + ONE_DAY_MS);
      }
      if (task.scheduledEnd) {
        data.scheduledEnd = new Date(task.scheduledEnd.getTime() + ONE_DAY_MS);
      }

      // Also shift dueDate if it matches the old scheduledStart date
      if (
        task.dueDate &&
        task.scheduledStart &&
        task.dueDate.toISOString().slice(0, 10) ===
          task.scheduledStart.toISOString().slice(0, 10)
      ) {
        data.dueDate = new Date(task.dueDate.getTime() + ONE_DAY_MS);
      }

      return prisma.task.update({
        where: { id: task.id },
        data,
      });
    });

    await prisma.$transaction(updates);
    total += overdue.length;
  }

  return total;
}
