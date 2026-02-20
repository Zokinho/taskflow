import type { Context } from "grammy";
import type { User } from "@prisma/client";

export interface CommandRoute {
  pattern: RegExp;
  handler: (ctx: Context, user: User, match: RegExpMatchArray) => Promise<void>;
  description: string;
}

const routes: CommandRoute[] = [];

export function registerCommands(newRoutes: CommandRoute[]): void {
  routes.push(...newRoutes);
}

/** Normalize voice transcription artifacts into clean command text */
function normalizeForDispatch(text: string): string {
  return text
    .trim()
    .replace(/[.!?]+$/, "")              // strip trailing punctuation
    .replace(/^(\w+)\s*[:]\s*/, "$1 ")    // "Task: buy" → "Task buy"
    .replace(/\s{2,}/g, " ")              // collapse multiple spaces
    .trim();
}

export async function dispatch(
  ctx: Context,
  user: User,
  text: string
): Promise<boolean> {
  const normalized = normalizeForDispatch(text);
  for (const route of routes) {
    const match = normalized.match(route.pattern);
    if (match) {
      await route.handler(ctx, user, match);
      return true;
    }
  }
  return false;
}

export function getHelpText(): string {
  const lines = ["<b>TaskFlow Commands</b>\n"];

  lines.push("<b>Tasks:</b>");
  lines.push("  <code>task [title] [date] [duration]</code> — Create task");
  lines.push("  <code>done [id]</code> — Complete task");
  lines.push("  <code>defer [id] [when]</code> — Reschedule task");
  lines.push("  <code>delete [id]</code> — Delete task");
  lines.push("  <code>note [id] [text]</code> — Add note to task");
  lines.push("  <code>schedule tasks</code> — Auto-schedule tasks into free slots");

  lines.push("\n<b>Schedule:</b>");
  lines.push("  <code>today</code> — Today's schedule");
  lines.push("  <code>tomorrow</code> — Tomorrow's schedule");
  lines.push("  <code>week</code> — Week overview");
  lines.push("  <code>free</code> — Free time slots today");
  lines.push("  <code>monday</code>..<code>sunday</code> — Specific day");

  lines.push("\n<b>People:</b>");
  lines.push("  <code>person add [name]</code> — Add contact");
  lines.push("  <code>person [name]</code> — Look up contact");
  lines.push("  <code>contacted [name]</code> — Mark as contacted");
  lines.push("  <code>birthdays</code> — Upcoming birthdays");
  lines.push("  <code>followups</code> — Overdue follow-ups");

  lines.push("\n<b>Kids:</b>");
  lines.push("  <code>kids</code> — All kids' events this week");
  lines.push("  <code>kid add [name]</code> — Add a kid");
  lines.push("  <code>[kidname] today/tomorrow/week</code> — Kid's schedule");

  lines.push("\n<b>Voice:</b>");
  lines.push("  Send a voice message — transcribed and executed as command");

  return lines.join("\n");
}
