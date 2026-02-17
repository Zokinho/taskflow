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

export function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-based
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
