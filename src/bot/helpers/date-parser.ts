import * as chrono from "chrono-node";

export interface ParsedDateTime {
  date: Date | null;
  durationMins: number | null;
}

const DURATION_RE = /\b(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:ins?)?\b|\b(\d+)\s*h(?:ours?)?\b|\b(\d+)\s*m(?:ins?)?\b/i;

export function parseDuration(input: string): number | null {
  const m = input.match(DURATION_RE);
  if (!m) return null;
  if (m[1] && m[2]) return parseInt(m[1]) * 60 + parseInt(m[2]);
  if (m[3]) return parseInt(m[3]) * 60;
  if (m[4]) return parseInt(m[4]);
  return null;
}

export function parseDateTime(
  input: string,
  timezone?: string
): ParsedDateTime {
  const durationMins = parseDuration(input);

  // Remove duration from input before chrono parsing to avoid confusion
  const cleaned = input.replace(DURATION_RE, "").trim();

  const ref = new Date();
  const results = chrono.parse(cleaned, { instant: ref, timezone });
  const date = results.length > 0 ? results[0].start.date() : null;

  return { date, durationMins };
}

export function stripDateAndDuration(input: string): string {
  // Remove duration
  let cleaned = input.replace(DURATION_RE, "");
  // Remove chrono-parsed date parts
  const results = chrono.parse(cleaned);
  for (const r of results) {
    cleaned = cleaned.replace(r.text, "");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Get "now" in the user's timezone as a Date whose UTC fields
 * represent the wall-clock date/time in that timezone.
 */
function nowInTimezone(timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0");

  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  );
}

/**
 * Get midnight-to-midnight range for the given date in the user's timezone.
 * Returns UTC Date objects corresponding to those boundaries.
 */
export function getDayRange(
  date: Date,
  timezone?: string
): { start: Date; end: Date } {
  if (timezone) {
    // Find what date `date` corresponds to in the user's TZ
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
    }).format(date);
    // dateStr is YYYY-MM-DD in user's TZ
    const start = tzMidnight(dateStr, timezone);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  // Fallback: server-local
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Get Monday-to-Sunday week range in the user's timezone.
 */
export function getWeekRange(
  date: Date,
  timezone?: string
): { start: Date; end: Date } {
  if (timezone) {
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
    }).format(date);
    const d = new Date(dateStr + "T12:00:00Z"); // noon to avoid DST edge
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday-based
    d.setUTCDate(d.getUTCDate() + diff);
    const mondayStr = d.toISOString().slice(0, 10);
    const start = tzMidnight(mondayStr, timezone);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
  // Fallback: server-local
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function parseDayName(dayName: string): Date | null {
  const result = chrono.parseDate(`next ${dayName}`);
  return result;
}

/**
 * Get "today" as an ISO date string (YYYY-MM-DD) in the user's timezone.
 */
export function todayStr(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

/**
 * Convert a YYYY-MM-DD date string to midnight UTC for that timezone.
 * e.g. "2026-02-20" in "Europe/Amsterdam" → the UTC instant when it's
 * midnight on Feb 20 in Amsterdam.
 */
function tzMidnight(dateStr: string, timezone: string): Date {
  // Create date at noon UTC to get offset safely
  const probe = new Date(dateStr + "T12:00:00Z");

  // Format that instant in the target TZ to figure out the offset
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(probe);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0");

  // The probe was 12:00 UTC — what time did the TZ see?
  const tzHour = get("hour");
  const tzMinute = get("minute");
  // Offset = TZ_time - UTC_time
  const offsetMs = (tzHour * 60 + tzMinute - 12 * 60) * 60 * 1000;

  // Midnight in TZ = midnight local - offset = UTC
  const midnight = new Date(dateStr + "T00:00:00Z");
  return new Date(midnight.getTime() - offsetMs);
}
