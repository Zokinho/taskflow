import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function resolveUser(chatId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { telegramChatId: chatId },
  });
}
