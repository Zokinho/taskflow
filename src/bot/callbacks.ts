import type { Bot, Context } from "grammy";
import { prisma } from "../lib/prisma";
import { resolveUser } from "./middleware";
import { truncate, shortId, formatTask } from "./helpers/format";
import {
  mainMenuKeyboard,
  scheduleNavKeyboard,
  weekNavKeyboard,
  tasksListKeyboard,
  kidsListKeyboard,
  kidScheduleKeyboard,
  peopleKeyboard,
  freeSlotsKeyboard,
} from "./helpers/keyboards";
import {
  buildDaySchedule,
  buildWeekSchedule,
  buildFreeSlots,
} from "./commands/schedule";
import { buildTaskList, findTaskByShortId } from "./commands/tasks";
import { buildKidsWeek, buildKidSchedule, findKidByShortId } from "./commands/kids";
import { buildBirthdays, buildFollowups } from "./commands/people";
import { autoScheduleTasks } from "../services/auto-scheduler";

/** Edit message text, silently ignoring "message is not modified" errors */
async function safeEdit(
  ctx: Context,
  text: string,
  options: { parse_mode?: "HTML"; reply_markup?: ReturnType<typeof mainMenuKeyboard> }
) {
  try {
    await ctx.editMessageText(truncate(text), options);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("message is not modified")) {
      throw err;
    }
  }
}

export function registerCallbacks(bot: Bot) {
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.callbackQuery.from.id.toString();

    const user = await resolveUser(chatId);
    if (!user) {
      await ctx.answerCallbackQuery({
        text: "Account not linked. Use /start first.",
        show_alert: true,
      });
      return;
    }

    try {
      await handleCallback(ctx, user, data);
    } catch (err) {
      console.error("Callback error:", err);
      await ctx.answerCallbackQuery({ text: "Something went wrong." });
    }
  });
}

async function handleCallback(
  ctx: Context,
  user: { id: string; timezone: string },
  data: string
) {
  // Menu
  if (data === "menu") {
    await safeEdit(ctx, "<b>TaskFlow Menu</b>\n\nChoose an action:", {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Schedule: today
  if (data === "t:today") {
    const { text, dateStr } = await buildDaySchedule(user.id, new Date(), user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: scheduleNavKeyboard(dateStr),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Schedule: tomorrow
  if (data === "t:tmrw") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { text, dateStr } = await buildDaySchedule(user.id, tomorrow, user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: scheduleNavKeyboard(dateStr),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Schedule: week
  if (data === "t:week") {
    const text = await buildWeekSchedule(user.id, user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: weekNavKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Schedule: free slots
  if (data === "t:free") {
    const text = await buildFreeSlots(user.id, user.timezone);
    await safeEdit(ctx, text, {
      parse_mode: "HTML",
      reply_markup: freeSlotsKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Schedule: specific day
  if (data.startsWith("t:day:")) {
    const dateStr = data.slice(6); // YYYY-MM-DD
    const target = new Date(dateStr + "T12:00:00Z");
    const result = await buildDaySchedule(user.id, target, user.timezone);
    await safeEdit(ctx, truncate(result.text), {
      parse_mode: "HTML",
      reply_markup: scheduleNavKeyboard(result.dateStr),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Tasks list
  if (data === "tasks") {
    const { text, tasks } = await buildTaskList(user.id, user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: tasks.length > 0 ? tasksListKeyboard(tasks) : undefined,
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Task done
  if (data.startsWith("td:")) {
    const sid = data.slice(3);
    const task = await findTaskByShortId(user.id, sid);
    if (!task) {
      await ctx.answerCallbackQuery({ text: `Task ${sid} not found.` });
      return;
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "DONE", completedAt: new Date() },
    });

    await ctx.answerCallbackQuery({ text: `Done: ${task.title}` });

    // Refresh task list in-place
    const { text, tasks } = await buildTaskList(user.id, user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: tasks.length > 0 ? tasksListKeyboard(tasks) : undefined,
    });
    return;
  }

  // Task defer to tomorrow
  if (data.startsWith("tf:")) {
    const sid = data.slice(3);
    const task = await findTaskByShortId(user.id, sid);
    if (!task) {
      await ctx.answerCallbackQuery({ text: `Task ${sid} not found.` });
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    await prisma.task.update({
      where: { id: task.id },
      data: { dueDate: tomorrow, scheduledStart: null, scheduledEnd: null },
    });

    await ctx.answerCallbackQuery({ text: `Deferred: ${task.title}` });

    // Refresh task list in-place
    const { text, tasks } = await buildTaskList(user.id, user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: tasks.length > 0 ? tasksListKeyboard(tasks) : undefined,
    });
    return;
  }

  // Auto-schedule
  if (data === "autosched") {
    const count = await autoScheduleTasks(user.id);
    const msg = count === 0
      ? "No tasks to schedule."
      : `Scheduled ${count} task${count === 1 ? "" : "s"}.`;
    await ctx.answerCallbackQuery({ text: msg });

    // Show updated task list
    const { text, tasks } = await buildTaskList(user.id, user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: tasks.length > 0 ? tasksListKeyboard(tasks) : undefined,
    });
    return;
  }

  // Kids list
  if (data === "kids") {
    const { text, kids } = await buildKidsWeek(user.id, user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: kids.length > 0 ? kidsListKeyboard(kids) : undefined,
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Kid schedule: k:XXXXXX:today/tmrw/week
  if (data.startsWith("k:")) {
    const parts = data.split(":");
    if (parts.length === 3) {
      const kidSid = parts[1];
      const period = parts[2];
      const kid = await findKidByShortId(user.id, kidSid);
      if (!kid) {
        await ctx.answerCallbackQuery({ text: "Kid not found." });
        return;
      }

      const text = await buildKidSchedule(kid.id, kid.name, period, user.timezone);
      await safeEdit(ctx, truncate(text), {
        parse_mode: "HTML",
        reply_markup: kidScheduleKeyboard(kidSid),
      });
      await ctx.answerCallbackQuery();
      return;
    }
  }

  // Birthdays
  if (data === "bdays") {
    const text = await buildBirthdays(user.id, user.timezone);
    await safeEdit(ctx, text, {
      parse_mode: "HTML",
      reply_markup: peopleKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Follow-ups
  if (data === "fups") {
    const text = await buildFollowups(user.id, user.timezone);
    await safeEdit(ctx, truncate(text), {
      parse_mode: "HTML",
      reply_markup: peopleKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  // Unknown callback
  await ctx.answerCallbackQuery({ text: "Unknown action." });
}
