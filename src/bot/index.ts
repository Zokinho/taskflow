import "dotenv/config";
import { getBot } from "../services/telegram";
import { prisma } from "../lib/prisma";
import { resolveUser } from "./middleware";
import { registerCommands, dispatch, getHelpText } from "./dispatcher";
import { transcribeVoice } from "./voice";
import { taskRoutes } from "./commands/tasks";
import { scheduleRoutes } from "./commands/schedule";
import { peopleRoutes } from "./commands/people";
import { kidsRoutes } from "./commands/kids";

const bot = getBot();
if (!bot) {
  console.error("TELEGRAM_BOT_TOKEN is not set. Bot cannot start.");
  process.exit(1);
}

// Register commands (order matters — specific first, ambiguous last)
registerCommands(taskRoutes);
registerCommands(scheduleRoutes);
registerCommands(peopleRoutes);
registerCommands(kidsRoutes);

// /start — account linking (keep existing logic)
bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const code = ctx.match?.trim();

  if (!code) {
    ctx.reply(
      `Welcome to TaskFlow!\n\nYour chat ID: <code>${chatId}</code>\n\nTo link your account, go to the web dashboard \u2192 Reminders \u2192 Link Telegram, then send the code here:\n<code>/start YOUR_CODE</code>`,
      { parse_mode: "HTML" }
    );
    return;
  }

  // Find user with matching link code
  const users = await prisma.user.findMany({
    where: { telegramChatId: null },
  });

  const user = users.find((u) => {
    const prefs = u.preferences as Record<string, unknown>;
    return prefs.telegramLinkCode === code;
  });

  if (!user) {
    ctx.reply("Invalid or expired link code. Please generate a new one from the web dashboard.");
    return;
  }

  // Link the account
  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: chatId,
      preferences: {
        ...(user.preferences as Record<string, unknown>),
        telegramLinkCode: undefined,
      },
    },
  });

  ctx.reply(
    `Account linked successfully! You'll now receive reminders here.\n\nLinked to: ${user.name} (${user.email})`
  );
});

// /help
bot.command("help", async (ctx) => {
  await ctx.reply(getHelpText(), { parse_mode: "HTML" });
});

// Voice messages
bot.on("message:voice", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const user = await resolveUser(chatId);
  if (!user) {
    await ctx.reply(
      "Your account is not linked. Use /start with a link code from the web dashboard."
    );
    return;
  }

  try {
    await ctx.reply("Transcribing...");
    const text = await transcribeVoice(ctx);
    if (!text) {
      await ctx.reply("Could not transcribe the voice message.");
      return;
    }

    await ctx.reply(`Heard: <i>${text}</i>`, { parse_mode: "HTML" });
    const handled = await dispatch(ctx, user, text);
    if (!handled) {
      await ctx.reply(
        "Could not understand the command. Type /help for available commands."
      );
    }
  } catch (err) {
    console.error("Voice handler error:", err);
    await ctx.reply("Something went wrong processing your voice message.");
  }
});

// Text messages (non-command)
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;

  // Skip bot commands (handled by grammy's command handlers)
  if (text.startsWith("/")) return;

  const chatId = ctx.chat.id.toString();
  const user = await resolveUser(chatId);
  if (!user) {
    await ctx.reply(
      "Your account is not linked. Use /start with a link code from the web dashboard."
    );
    return;
  }

  try {
    const handled = await dispatch(ctx, user, text);
    if (!handled) {
      await ctx.reply(
        "Unknown command. Type /help for available commands."
      );
    }
  } catch (err) {
    console.error("Text handler error:", err);
    await ctx.reply("Something went wrong. Please try again.");
  }
});

bot.start({
  onStart: () => console.log("TaskFlow bot started"),
});
