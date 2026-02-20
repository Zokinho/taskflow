import type { Context } from "grammy";
import type { User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { CommandRoute } from "../dispatcher";
import { todayStr } from "../helpers/date-parser";
import {
  formatPerson,
  escapeHtml,
  truncate,
  shortId,
} from "../helpers/format";

async function handlePersonAdd(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const name = match[1].trim();
  if (!name) {
    await ctx.reply("Usage: <code>person add [name]</code>", {
      parse_mode: "HTML",
    });
    return;
  }

  const person = await prisma.person.create({
    data: { userId: user.id, name },
  });

  await ctx.reply(
    `Added: <b>${escapeHtml(person.name)}</b> <code>${shortId(person.id)}</code>`,
    { parse_mode: "HTML" }
  );
}

async function handlePersonLookup(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const name = match[1].trim();
  const people = await prisma.person.findMany({
    where: {
      userId: user.id,
      name: { contains: name, mode: "insensitive" },
    },
    take: 5,
  });

  if (people.length === 0) {
    await ctx.reply(`No contacts matching "${escapeHtml(name)}"`, {
      parse_mode: "HTML",
    });
    return;
  }

  const text = people.map((p) => formatPerson(p, user.timezone)).join("\n\n");
  await ctx.reply(truncate(text), { parse_mode: "HTML" });
}

async function handleContacted(
  ctx: Context,
  user: User,
  match: RegExpMatchArray
) {
  const name = match[1].trim();
  const person = await prisma.person.findFirst({
    where: {
      userId: user.id,
      name: { contains: name, mode: "insensitive" },
    },
  });

  if (!person) {
    await ctx.reply(`No contact matching "${escapeHtml(name)}"`, {
      parse_mode: "HTML",
    });
    return;
  }

  await prisma.person.update({
    where: { id: person.id },
    data: { lastContactAt: new Date() },
  });

  await ctx.reply(
    `Marked contact with <b>${escapeHtml(person.name)}</b>`,
    { parse_mode: "HTML" }
  );
}

async function handleBirthdays(ctx: Context, user: User) {
  const nowStr = todayStr(user.timezone);
  const now = new Date(nowStr + "T12:00:00Z"); // noon to avoid edge cases

  // Fetch all people + kids with birthdays
  const [people, kids] = await Promise.all([
    prisma.person.findMany({
      where: { userId: user.id, birthday: { not: null } },
    }),
    prisma.kid.findMany({
      where: { userId: user.id, birthday: { not: null } },
    }),
  ]);

  const upcoming: { name: string; date: Date; daysUntil: number }[] = [];

  const checkBirthday = (name: string, birthday: Date) => {
    const next = new Date(birthday);
    next.setFullYear(now.getUTCFullYear());
    // Use UTC month/day comparison since 'now' is constructed as UTC noon
    if (
      next.getUTCMonth() < now.getUTCMonth() ||
      (next.getUTCMonth() === now.getUTCMonth() && next.getUTCDate() < now.getUTCDate())
    ) {
      next.setFullYear(now.getUTCFullYear() + 1);
    }
    const daysUntil = Math.ceil(
      (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 30) {
      upcoming.push({ name, date: next, daysUntil });
    }
  };

  for (const p of people) {
    if (p.birthday) checkBirthday(p.name, p.birthday);
  }
  for (const k of kids) {
    if (k.birthday) checkBirthday(k.name, k.birthday);
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  if (upcoming.length === 0) {
    await ctx.reply("No birthdays in the next 30 days.");
    return;
  }

  const lines = ["<b>Upcoming Birthdays</b>\n"];
  for (const u of upcoming) {
    const dayStr =
      u.daysUntil === 0
        ? "TODAY!"
        : u.daysUntil === 1
          ? "tomorrow"
          : `in ${u.daysUntil} days`;
    lines.push(
      `  ${escapeHtml(u.name)} — ${u.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: user.timezone })} (${dayStr})`
    );
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

async function handleFollowups(ctx: Context, user: User) {
  const people = await prisma.person.findMany({
    where: {
      userId: user.id,
      followUpDays: { not: null },
    },
  });

  const now = new Date();
  const overdue = people.filter((p) => {
    if (!p.followUpDays) return false;
    if (!p.lastContactAt) return true;
    const diff = Math.floor(
      (now.getTime() - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= p.followUpDays;
  });

  if (overdue.length === 0) {
    await ctx.reply("No overdue follow-ups. You're all caught up!");
    return;
  }

  const lines = ["<b>Overdue Follow-ups</b>\n"];
  for (const p of overdue) {
    const daysSince = p.lastContactAt
      ? Math.floor(
          (now.getTime() - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;
    const info = daysSince !== null ? `${daysSince} days ago` : "never contacted";
    lines.push(`  ${escapeHtml(p.name)} — ${info} (every ${p.followUpDays}d)`);
  }

  await ctx.reply(truncate(lines.join("\n")), { parse_mode: "HTML" });
}

export const peopleRoutes: CommandRoute[] = [
  {
    pattern: /^person\s+add\s+(.+)$/i,
    handler: handlePersonAdd,
    description: "person add [name] — Add contact",
  },
  {
    pattern: /^person\s+(.+)$/i,
    handler: handlePersonLookup,
    description: "person [name] — Look up contact",
  },
  {
    pattern: /^contacted\s+(.+)$/i,
    handler: handleContacted,
    description: "contacted [name] — Mark as contacted",
  },
  {
    pattern: /^birthdays$/i,
    handler: (ctx, user, _m) => handleBirthdays(ctx, user),
    description: "birthdays — Upcoming birthdays",
  },
  {
    pattern: /^followups$/i,
    handler: (ctx, user, _m) => handleFollowups(ctx, user),
    description: "followups — Overdue follow-ups",
  },
];
