import type { Context } from "grammy";
import type { User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { CommandRoute } from "../dispatcher";
import {
  parseDateTime,
  stripDateAndDuration,
} from "../helpers/date-parser";
import { formatTask, shortId, truncate } from "../helpers/format";

async function findTaskByShortId(userId: string, sid: string) {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      id: { endsWith: sid },
    },
  });
  return tasks.length === 1 ? tasks[0] : null;
}

async function handleCreateTask(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const input = match[1].trim();
  if (!input) {
    await ctx.reply("Usage: <code>task [title] [date] [duration]</code>", {
      parse_mode: "HTML",
    });
    return;
  }

  const { date, durationMins } = parseDateTime(input, user.timezone);
  const title = stripDateAndDuration(input) || input;

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title,
      dueDate: date,
      estimatedMins: durationMins,
    },
  });

  const parts = [`Created: ${formatTask(task, user.timezone)}`];
  if (date) {
    parts.push(
      `Due: ${date.toLocaleDateString("en-US", { timeZone: user.timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
    );
  }
  if (durationMins) parts.push(`Duration: ${durationMins}m`);

  await ctx.reply(parts.join("\n"), { parse_mode: "HTML" });
}

async function handleDone(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const sid = match[1].trim();
  const task = await findTaskByShortId(user.id, sid);
  if (!task) {
    await ctx.reply(`Task <code>${sid}</code> not found.`, {
      parse_mode: "HTML",
    });
    return;
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: "DONE", completedAt: new Date() },
  });

  await ctx.reply(`Done! ${formatTask(updated, user.timezone)}`, { parse_mode: "HTML" });
}

async function handleDefer(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const sid = match[1].trim();
  const when = match[2]?.trim();
  const task = await findTaskByShortId(user.id, sid);
  if (!task) {
    await ctx.reply(`Task <code>${sid}</code> not found.`, {
      parse_mode: "HTML",
    });
    return;
  }

  const { date } = parseDateTime(when || "tomorrow", user.timezone);
  if (!date) {
    await ctx.reply("Could not parse date. Try: <code>defer abc123 friday</code>", {
      parse_mode: "HTML",
    });
    return;
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { dueDate: date, scheduledStart: null, scheduledEnd: null },
  });

  await ctx.reply(
    `Deferred to ${date.toLocaleDateString("en-US", { timeZone: user.timezone, weekday: "short", month: "short", day: "numeric" })}: ${formatTask(updated, user.timezone)}`,
    { parse_mode: "HTML" }
  );
}

async function handleDeleteTask(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const sid = match[1].trim();
  const task = await findTaskByShortId(user.id, sid);
  if (!task) {
    await ctx.reply(`Task <code>${sid}</code> not found.`, {
      parse_mode: "HTML",
    });
    return;
  }

  await prisma.task.delete({ where: { id: task.id } });
  await ctx.reply(`Deleted: ${task.title}`, { parse_mode: "HTML" });
}

async function handleNote(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const sid = match[1].trim();
  const noteText = match[2]?.trim();
  if (!noteText) {
    await ctx.reply("Usage: <code>note [id] [text]</code>", {
      parse_mode: "HTML",
    });
    return;
  }

  const task = await findTaskByShortId(user.id, sid);
  if (!task) {
    await ctx.reply(`Task <code>${sid}</code> not found.`, {
      parse_mode: "HTML",
    });
    return;
  }

  const existing = task.notes || "";
  const newNotes = existing
    ? `${existing}\n${noteText}`
    : noteText;

  await prisma.task.update({
    where: { id: task.id },
    data: { notes: newNotes },
  });

  await ctx.reply(
    `Note added to <code>${shortId(task.id)}</code>: ${task.title}`,
    { parse_mode: "HTML" }
  );
}

async function handleListTasks(
  ctx: Context,
  user: User,
  _match: RegExpMatchArray
) {
  const tasks = await prisma.task.findMany({
    where: { userId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    take: 20,
  });

  if (tasks.length === 0) {
    await ctx.reply("No open tasks.");
    return;
  }

  const text = "<b>Open Tasks</b>\n" + tasks.map((t) => formatTask(t, user.timezone)).join("\n");
  await ctx.reply(truncate(text), { parse_mode: "HTML" });
}

export const taskRoutes: CommandRoute[] = [
  {
    pattern: /^task\s+(.+)$/i,
    handler: handleCreateTask,
    description: "task [title] [date] [duration] — Create task",
  },
  {
    pattern: /^done\s+(\S+)$/i,
    handler: handleDone,
    description: "done [id] — Complete task",
  },
  {
    pattern: /^defer\s+(\S+)\s*(.*)$/i,
    handler: handleDefer,
    description: "defer [id] [when] — Reschedule task",
  },
  {
    pattern: /^delete\s+(\S+)$/i,
    handler: handleDeleteTask,
    description: "delete [id] — Delete task",
  },
  {
    pattern: /^note\s+(\S+)\s+(.+)$/i,
    handler: handleNote,
    description: "note [id] [text] — Add note to task",
  },
  {
    pattern: /^tasks$/i,
    handler: handleListTasks,
    description: "tasks — List open tasks",
  },
];
