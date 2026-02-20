import "dotenv/config";
import cron from "node-cron";
import {
  generateBirthdayReminders,
  generateFollowUpReminders,
  generateMorningBriefings,
  generateEveningReviews,
  deliverPendingReminders,
} from "../services/reminders";
import { syncAllCalendars } from "../services/calendar-sync";
import { deferOverdueTasks } from "../services/task-defer";
import { autoScheduleAllUsers } from "../services/auto-scheduler";
import { getBot } from "../services/telegram";

function logJob(name: string, fn: () => Promise<number>) {
  return async () => {
    try {
      const count = await fn();
      if (count > 0) console.log(`[cron] ${name}: ${count}`);
    } catch (err) {
      console.error(`[cron] ${name} failed:`, err);
    }
  };
}

// Birthday reminders — daily at 00:05
cron.schedule("5 0 * * *", logJob("birthdays", generateBirthdayReminders));

// Follow-up nudges — daily at 00:10
cron.schedule("10 0 * * *", logJob("follow-ups", generateFollowUpReminders));

// Morning briefings — daily at 06:00 UTC
cron.schedule("0 6 * * *", logJob("morning", generateMorningBriefings));

// Evening reviews — daily at 20:00 UTC
cron.schedule("0 20 * * *", logJob("evening", generateEveningReviews));

// Deliver pending reminders — every 5 minutes
cron.schedule("*/5 * * * *", logJob("deliver", deliverPendingReminders));

// Auto-defer overdue tasks — daily at 00:15
cron.schedule("15 0 * * *", logJob("defer-tasks", deferOverdueTasks));

// Auto-schedule tasks — daily at 00:20 (after defer at 00:15)
cron.schedule("20 0 * * *", logJob("auto-schedule", autoScheduleAllUsers));

// Calendar auto-sync — every 15 minutes
cron.schedule("*/15 * * * *", logJob("calendar-sync", syncAllCalendars));

console.log("[cron] Reminder and calendar-sync jobs scheduled");

// Optionally start bot polling in same process
if (process.env.START_BOT_WITH_CRON === "true") {
  const bot = getBot();
  if (bot) {
    // Import bot commands (registers handlers)
    import("../bot/index").then(() => {
      console.log("[cron] Bot started alongside cron");
    });
  } else {
    console.warn("[cron] START_BOT_WITH_CRON=true but no TELEGRAM_BOT_TOKEN");
  }
}
