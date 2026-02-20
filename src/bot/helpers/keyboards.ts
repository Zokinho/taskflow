import { InlineKeyboard } from "grammy";
import type { Task, Kid } from "@prisma/client";
import { shortId } from "./format";

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Today", "t:today")
    .text("Tomorrow", "t:tmrw")
    .text("Week", "t:week")
    .row()
    .text("Tasks", "tasks")
    .text("Free Slots", "t:free")
    .text("Auto Schedule", "autosched")
    .row()
    .text("Birthdays", "bdays")
    .text("Follow-ups", "fups")
    .row()
    .text("Kids", "kids");
}

export function scheduleNavKeyboard(dateStr: string): InlineKeyboard {
  const d = new Date(dateStr + "T12:00:00Z");
  const prev = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
  const next = new Date(d.getTime() + 86400000).toISOString().slice(0, 10);
  return new InlineKeyboard()
    .text("\u25c0 Prev", `t:day:${prev}`)
    .text("Next \u25b6", `t:day:${next}`)
    .row()
    .text("Tasks", "tasks")
    .text("Free Slots", "t:free")
    .row()
    .text("Menu", "menu");
}

export function weekNavKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Today", "t:today")
    .text("Free Slots", "t:free")
    .row()
    .text("Tasks", "tasks")
    .text("Menu", "menu");
}

export function tasksListKeyboard(tasks: Task[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  const shown = tasks.slice(0, 8);
  for (const t of shown) {
    const sid = shortId(t.id);
    const name = t.title.length > 25 ? t.title.slice(0, 24) + "\u2026" : t.title;
    kb.text(`\u2705 ${name}`, `td:${sid}`)
      .text(`\u23e9`, `tf:${sid}`)
      .row();
  }
  kb.text("Auto Schedule", "autosched").text("Menu", "menu");
  return kb;
}

export function kidsListKeyboard(kids: Kid[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let i = 0; i < kids.length; i++) {
    const sid = shortId(kids[i].id);
    kb.text(kids[i].name, `k:${sid}:today`);
    if (i % 2 === 1) kb.row();
  }
  if (kids.length % 2 === 1) kb.row();
  kb.text("Menu", "menu");
  return kb;
}

export function kidScheduleKeyboard(kidShortId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Today", `k:${kidShortId}:today`)
    .text("Tomorrow", `k:${kidShortId}:tmrw`)
    .text("Week", `k:${kidShortId}:week`)
    .row()
    .text("All Kids", "kids")
    .text("Menu", "menu");
}

export function peopleKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Birthdays", "bdays")
    .text("Follow-ups", "fups")
    .row()
    .text("Menu", "menu");
}

export function freeSlotsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Today", "t:today")
    .text("Auto Schedule", "autosched")
    .row()
    .text("Menu", "menu");
}
