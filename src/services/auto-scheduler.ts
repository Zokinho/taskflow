import { prisma } from "../lib/prisma";
import type { User, Task } from "@prisma/client";

interface Interval {
  start: Date;
  end: Date;
}

interface WorkHours {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  workDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

const BUFFER_MINS = 10;
const LOOKAHEAD_DAYS = 7;

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Extract work hours from user preferences, with sensible defaults.
 */
function getWorkHours(user: User): WorkHours {
  const prefs = (user.preferences ?? {}) as Record<string, unknown>;

  const startStr = typeof prefs.workHoursStart === "string" ? prefs.workHoursStart : "09:00";
  const endStr = typeof prefs.workHoursEnd === "string" ? prefs.workHoursEnd : "17:00";
  const workDays = Array.isArray(prefs.workDays)
    ? (prefs.workDays as number[])
    : [1, 2, 3, 4, 5]; // Mon-Fri

  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);

  return {
    startHour: sh,
    startMinute: sm,
    endHour: eh,
    endMinute: em,
    workDays,
  };
}

/**
 * Compute UTC midnight for a given YYYY-MM-DD date string in a timezone.
 * Uses the same Intl pattern as task-defer.ts.
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
 * Get today's date string in user's timezone.
 */
function todayStr(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

/**
 * Get the day-of-week (0=Sun..6=Sat) for a date string in a timezone.
 */
function dayOfWeek(dateStr: string, timezone: string): number {
  const dt = tzMidnight(dateStr, timezone);
  // Format in the timezone to get the correct weekday
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(dt);
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[wd] ?? 0;
}

/**
 * Add N days to a YYYY-MM-DD string.
 */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Query all busy intervals for a user within a time range.
 * Includes calendar events and already-scheduled tasks.
 */
async function getBusyIntervals(
  userId: string,
  from: Date,
  to: Date
): Promise<Interval[]> {
  // Calendar events from all active calendars
  const calendars = await prisma.calendar.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });

  const calendarIds = calendars.map((c) => c.id);

  const events = calendarIds.length > 0
    ? await prisma.calendarEvent.findMany({
        where: {
          calendarId: { in: calendarIds },
          startTime: { lt: to },
          endTime: { gt: from },
        },
        select: { startTime: true, endTime: true, allDay: true },
      })
    : [];

  // Already-scheduled tasks (that have a scheduledStart)
  const scheduledTasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      scheduledStart: { not: null, lt: to },
      scheduledEnd: { not: null, gt: from },
    },
    select: { scheduledStart: true, scheduledEnd: true },
  });

  const intervals: Interval[] = [];

  for (const ev of events) {
    // All-day events: they span the whole day but we handle them per-day
    // in the slot computation, so skip explicit interval — they'll be
    // covered by the day-level work-hour windows.
    // Actually, all-day events should block the entire work-hours window.
    // We'll add them as-is and let merging handle it.
    intervals.push({ start: ev.startTime, end: ev.endTime });
  }

  for (const t of scheduledTasks) {
    if (t.scheduledStart && t.scheduledEnd) {
      intervals.push({ start: t.scheduledStart, end: t.scheduledEnd });
    }
  }

  return intervals;
}

/**
 * Merge overlapping or adjacent intervals. Input must be sorted by start.
 */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const merged: Interval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];

    if (cur.start.getTime() <= last.end.getTime()) {
      // Overlap or adjacent — extend
      if (cur.end.getTime() > last.end.getTime()) {
        last.end = cur.end;
      }
    } else {
      merged.push({ ...cur });
    }
  }

  return merged;
}

/**
 * Compute free slots within a work-hours window for a single day,
 * subtracting busy intervals.
 */
function getFreeSlots(
  dayMidnight: Date,
  workHours: WorkHours,
  busyIntervals: Interval[]
): Interval[] {
  const dayStart = new Date(
    dayMidnight.getTime() +
      (workHours.startHour * 60 + workHours.startMinute) * 60 * 1000
  );
  const dayEnd = new Date(
    dayMidnight.getTime() +
      (workHours.endHour * 60 + workHours.endMinute) * 60 * 1000
  );

  // Don't schedule in the past
  const now = new Date();
  const effectiveStart = dayStart.getTime() < now.getTime() ? now : dayStart;

  if (effectiveStart.getTime() >= dayEnd.getTime()) return [];

  // Filter busy intervals that overlap this day's work hours
  const relevant = busyIntervals.filter(
    (b) =>
      b.start.getTime() < dayEnd.getTime() &&
      b.end.getTime() > effectiveStart.getTime()
  );

  if (relevant.length === 0) {
    return [{ start: effectiveStart, end: dayEnd }];
  }

  const slots: Interval[] = [];
  let cursor = effectiveStart.getTime();

  for (const busy of relevant) {
    const busyStart = Math.max(busy.start.getTime(), effectiveStart.getTime());
    const busyEnd = Math.min(busy.end.getTime(), dayEnd.getTime());

    if (cursor < busyStart) {
      slots.push({ start: new Date(cursor), end: new Date(busyStart) });
    }
    cursor = Math.max(cursor, busyEnd);
  }

  if (cursor < dayEnd.getTime()) {
    slots.push({ start: new Date(cursor), end: dayEnd });
  }

  return slots;
}

/**
 * Main auto-scheduling function for a single user.
 * Returns the number of tasks that were scheduled.
 */
export async function autoScheduleTasks(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const workHours = getWorkHours(user);

  // Get unscheduled tasks with an estimated duration
  const unscheduledTasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      estimatedMins: { not: null },
      scheduledStart: null,
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  if (unscheduledTasks.length === 0) return 0;

  // Sort: URGENT first → LOW last, then by dueDate (nulls last)
  const sorted = [...unscheduledTasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;

    // Due date: nulls last
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return 0;
  });

  // Compute the 7-day window
  const today = todayStr(user.timezone);
  const windowStart = tzMidnight(today, user.timezone);
  const endDateStr = addDays(today, LOOKAHEAD_DAYS);
  const windowEnd = tzMidnight(endDateStr, user.timezone);

  // Get all busy intervals for the window
  const rawBusy = await getBusyIntervals(userId, windowStart, windowEnd);
  const busyIntervals = mergeIntervals(rawBusy);

  // Build a mutable copy of busy intervals (we'll add scheduled tasks to it)
  const allBusy = [...busyIntervals];

  // Collect updates
  const updates: { id: string; scheduledStart: Date; scheduledEnd: Date }[] = [];

  // Pre-compute free slots per day
  const dayDates: { dateStr: string; midnight: Date; dow: number }[] = [];
  for (let d = 0; d < LOOKAHEAD_DAYS; d++) {
    const ds = addDays(today, d);
    dayDates.push({
      dateStr: ds,
      midnight: tzMidnight(ds, user.timezone),
      dow: dayOfWeek(ds, user.timezone),
    });
  }

  for (const task of sorted) {
    const durationMs = task.estimatedMins! * 60 * 1000;
    let placed = false;

    for (const day of dayDates) {
      // Skip non-work days
      if (!workHours.workDays.includes(day.dow)) continue;

      const slots = getFreeSlots(day.midnight, workHours, mergeIntervals(allBusy));

      for (const slot of slots) {
        const availableMs = slot.end.getTime() - slot.start.getTime();
        if (availableMs >= durationMs) {
          const scheduledStart = slot.start;
          const scheduledEnd = new Date(slot.start.getTime() + durationMs);

          updates.push({ id: task.id, scheduledStart, scheduledEnd });

          // Add this task + buffer to busy intervals so next task won't overlap
          allBusy.push({
            start: scheduledStart,
            end: new Date(scheduledEnd.getTime() + BUFFER_MINS * 60 * 1000),
          });

          placed = true;
          break;
        }
      }

      if (placed) break;
    }
    // If not placed in any day, skip this task
  }

  if (updates.length === 0) return 0;

  // Batch update in a transaction
  await prisma.$transaction(
    updates.map((u) =>
      prisma.task.update({
        where: { id: u.id },
        data: { scheduledStart: u.scheduledStart, scheduledEnd: u.scheduledEnd },
      })
    )
  );

  return updates.length;
}

/**
 * Clear auto-scheduled slots for all open tasks of a user.
 * Returns the number of tasks cleared.
 */
export async function clearScheduledTasks(userId: string): Promise<number> {
  const result = await prisma.task.updateMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      scheduledStart: { not: null },
    },
    data: {
      scheduledStart: null,
      scheduledEnd: null,
    },
  });

  return result.count;
}

/**
 * Run auto-schedule for all users. Used by cron job.
 */
export async function autoScheduleAllUsers(): Promise<number> {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  let total = 0;
  for (const user of users) {
    try {
      const count = await autoScheduleTasks(user.id);
      total += count;
    } catch (err) {
      console.error(`[auto-schedule] Failed for user ${user.id}:`, err);
    }
  }

  return total;
}
