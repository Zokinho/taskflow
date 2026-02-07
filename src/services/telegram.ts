import { Bot } from "grammy";

let bot: Bot | null = null;

export function getBot(): Bot | null {
  if (bot) return bot;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  bot = new Bot(token);
  return bot;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<boolean> {
  const b = getBot();
  if (!b) return false;
  try {
    await b.api.sendMessage(chatId, text, { parse_mode: "HTML" });
    return true;
  } catch (err) {
    console.error(`Failed to send Telegram message to ${chatId}:`, err);
    return false;
  }
}
