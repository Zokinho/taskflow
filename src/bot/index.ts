import "dotenv/config";
import { getBot } from "../services/telegram";
import { prisma } from "../lib/prisma";

const bot = getBot();
if (!bot) {
  console.error("TELEGRAM_BOT_TOKEN is not set. Bot cannot start.");
  process.exit(1);
}

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

bot.start({
  onStart: () => console.log("TaskFlow bot started"),
});
