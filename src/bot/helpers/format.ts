import type { Task, CalendarEvent, Person, Kid } from "@prisma/client";

const TELEGRAM_MAX = 4096;

export function shortId(id: string): string {
  return id.slice(-6);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function time(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dateStr(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const PRIORITY_ICONS: Record<string, string> = {
  URGENT: "!!!",
  HIGH: "!!",
  MEDIUM: "!",
  LOW: "",
};

const STATUS_ICONS: Record<string, string> = {
  TODO: "[ ]",
  IN_PROGRESS: "[~]",
  DONE: "[x]",
  CANCELLED: "[-]",
};

export function formatTask(task: Task): string {
  const sid = shortId(task.id);
  const status = STATUS_ICONS[task.status] || "[ ]";
  const pri = PRIORITY_ICONS[task.priority] || "";
  const due = task.dueDate ? ` | ${dateStr(task.dueDate)}` : "";
  const dur = task.estimatedMins ? ` | ${task.estimatedMins}m` : "";
  return `${status} <code>${sid}</code> ${pri ? pri + " " : ""}${escapeHtml(task.title)}${due}${dur}`;
}

export function formatEvent(event: CalendarEvent): string {
  const start = time(event.startTime);
  const end = time(event.endTime);
  if (event.allDay) {
    return `  All day: ${escapeHtml(event.title)}`;
  }
  return `  ${start}-${end} ${escapeHtml(event.title)}${event.location ? " @ " + escapeHtml(event.location) : ""}`;
}

export function formatDaySchedule(
  date: Date,
  events: CalendarEvent[],
  tasks: Task[]
): string {
  const header = `<b>${dateStr(date)}</b>`;
  const lines: string[] = [header];

  if (events.length === 0 && tasks.length === 0) {
    lines.push("  No events or tasks");
    return lines.join("\n");
  }

  if (events.length > 0) {
    for (const e of events) {
      lines.push(formatEvent(e));
    }
  }

  if (tasks.length > 0) {
    if (events.length > 0) lines.push("");
    lines.push("<b>Tasks:</b>");
    for (const t of tasks) {
      lines.push("  " + formatTask(t));
    }
  }

  return lines.join("\n");
}

export function formatPerson(person: Person): string {
  const lines: string[] = [
    `<b>${escapeHtml(person.name)}</b> <code>${shortId(person.id)}</code>`,
  ];
  if (person.email) lines.push(`  Email: ${escapeHtml(person.email)}`);
  if (person.phone) lines.push(`  Phone: ${escapeHtml(person.phone)}`);
  if (person.birthday) lines.push(`  Birthday: ${dateStr(person.birthday)}`);
  if (person.lastContactAt)
    lines.push(`  Last contact: ${dateStr(person.lastContactAt)}`);
  if (person.followUpDays)
    lines.push(`  Follow-up: every ${person.followUpDays} days`);
  if (person.tags.length > 0)
    lines.push(`  Tags: ${person.tags.join(", ")}`);
  if (person.notes) lines.push(`  Notes: ${escapeHtml(person.notes)}`);
  return lines.join("\n");
}

export function formatKid(kid: Kid): string {
  const lines = [`<b>${escapeHtml(kid.name)}</b> <code>${shortId(kid.id)}</code>`];
  if (kid.birthday) lines.push(`  Birthday: ${dateStr(kid.birthday)}`);
  if (kid.notes) lines.push(`  Notes: ${escapeHtml(kid.notes)}`);
  return lines.join("\n");
}

export function truncate(text: string, extra = 0): string {
  const max = TELEGRAM_MAX - extra;
  if (text.length <= max) return text;
  return text.slice(0, max - 20) + "\n... (truncated)";
}
