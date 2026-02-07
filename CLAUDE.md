# CLAUDE.md — TaskFlow

A personal productivity hub: calendars, tasks, contacts, and Telegram control.

## Project Overview

TaskFlow is a self-hosted productivity system that combines:
- Multi-calendar aggregation (Google, Microsoft, Exchange, Proton)
- Task management with auto-scheduling
- Personal CRM (people tracker with birthdays, notes, follow-up reminders)
- Kids' appointment tracking
- Telegram bot with voice support (via Whisper)
- Web dashboard (React PWA)

Target user: Busy parent juggling multiple calendars who values privacy.

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Telegram Bot:** grammy
- **Voice:** OpenAI Whisper API
- **Calendar APIs:** googleapis, @microsoft/microsoft-graph-client
- **Web App:** React + Vite + Tailwind (PWA)
- **Background Jobs:** node-cron
- **Hosting:** Hetzner VPS (~$5-6/month)

## Project Structure

```
taskflow/
├── prisma/
│   └── schema.prisma        # Database schema (DONE)
├── src/
│   ├── api/
│   │   ├── index.ts         # Express setup (DONE - needs route imports)
│   │   ├── routes/
│   │   │   ├── auth.ts      # TODO: JWT auth, login, register
│   │   │   ├── tasks.ts     # TODO: Task CRUD
│   │   │   ├── people.ts    # TODO: People CRUD
│   │   │   ├── calendars.ts # TODO: Calendar management
│   │   │   └── kids.ts      # TODO: Kids CRUD
│   │   └── middleware/
│   │       ├── auth.ts      # TODO: JWT verification
│   │       └── errorHandler.ts # TODO: Error handling
│   ├── bot/
│   │   ├── index.ts         # Bot setup (DONE)
│   │   ├── voice.ts         # Voice handling (DONE)
│   │   └── commands/
│   │       ├── tasks.ts     # Task commands (DONE)
│   │       ├── schedule.ts  # Schedule commands (DONE)
│   │       ├── people.ts    # People commands (DONE)
│   │       └── kids.ts      # Kids commands (DONE)
│   ├── services/
│   │   ├── scheduler.ts     # Auto-scheduling (DONE)
│   │   ├── calendar-sync.ts # TODO: Calendar provider sync
│   │   ├── reminders.ts     # TODO: Proactive messages
│   │   └── whisper.ts       # TODO: Extract from voice.ts
│   └── web/                 # TODO: React PWA
├── scripts/
│   ├── sync-calendars.ts    # TODO: Cron job
│   └── send-reminders.ts    # TODO: Cron job
├── .env.example             # Environment template (DONE)
├── docker-compose.yml       # Local PostgreSQL (DONE)
├── package.json             # Dependencies (DONE)
└── tsconfig.json            # TypeScript config (DONE)
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker-compose up -d

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Run database migrations
npx prisma migrate dev

# 5. Start development
npm run dev          # API server (terminal 1)
npm run bot          # Telegram bot (terminal 2)
```

## Database Schema

Already defined in `prisma/schema.prisma`. Key models:
- `User` — multi-tenant, stores Telegram chat ID, preferences
- `Calendar` — connected calendars (Google, Microsoft, Proton ICS, Exchange)
- `CalendarEvent` — cached events from calendars
- `Task` — tasks with auto-scheduling fields
- `Person` — CRM contacts with birthday, kids, notes
- `Kid` — for tagging kids' appointments
- `Reminder` — proactive messages (birthdays, follow-ups, briefings)

## Development Phases

### Phase 1: Foundation (PARTIALLY DONE)
- [x] Project setup (TypeScript, Express, Prisma)
- [x] Database schema
- [ ] API route stubs
- [ ] Auth middleware (JWT)
- [ ] Error handling middleware

### Phase 2: Tasks Core
- [x] Task bot commands
- [x] Auto-scheduling algorithm
- [ ] Task API routes
- [ ] Reschedule incomplete tasks (cron)

### Phase 3: Telegram Bot (MOSTLY DONE)
- [x] Bot setup with grammy
- [x] Task commands
- [x] Schedule commands
- [x] People commands
- [x] Kids commands
- [x] Voice message handling

### Phase 4: People Tracker
- [x] People bot commands
- [ ] People API routes
- [ ] Birthday reminder cron
- [ ] Follow-up nudge cron

### Phase 5: Calendar Sync
- [ ] Google Calendar OAuth + sync
- [ ] Microsoft Graph OAuth + sync
- [ ] Exchange (via Microsoft Graph)
- [ ] Proton ICS polling
- [ ] Event-to-task conversion
- [ ] Auto-tag kids from event titles

### Phase 6: Proactive Messages
- [ ] Morning briefing cron
- [ ] Evening review cron
- [ ] Birthday reminders
- [ ] Follow-up nudges

### Phase 7: Web App
- [ ] React + Vite setup
- [ ] Auth flow
- [ ] Task dashboard
- [ ] Calendar view
- [ ] People list
- [ ] PWA configuration

### Phase 8: Deploy
- [ ] Hetzner VPS setup
- [ ] Docker production compose
- [ ] SSL via Let's Encrypt
- [ ] Backup script

## Key Files to Work On Next

1. `src/api/routes/auth.ts` — JWT auth (register, login, token refresh)
2. `src/api/middleware/auth.ts` — Protect routes
3. `src/api/routes/tasks.ts` — CRUD for tasks
4. `src/services/calendar-sync.ts` — Start with Google Calendar

## Environment Variables Needed

```
DATABASE_URL          # PostgreSQL connection
JWT_SECRET            # For auth tokens
TELEGRAM_BOT_TOKEN    # From @BotFather
OPENAI_API_KEY        # For Whisper transcription
GOOGLE_CLIENT_ID      # Google OAuth
GOOGLE_CLIENT_SECRET
MICROSOFT_CLIENT_ID   # Microsoft OAuth
MICROSOFT_CLIENT_SECRET
```

## Multi-Tenant Notes

The schema is already multi-tenant:
- Every table has `userId` foreign key
- All queries must be scoped by user
- Telegram `chatId` maps to user on first message

## Commands Reference

### Telegram Bot Commands

**Tasks:**
- `task [title]` — create task
- `done [id]` — complete task
- `defer [id] [when]` — reschedule
- `delete [id]` — remove task
- `note [id] [text]` — add note

**Schedule:**
- `today` — today's schedule
- `tomorrow` — tomorrow's schedule
- `week` — week overview
- `free` — free time slots
- `monday`, `tuesday`, etc. — specific day

**People:**
- `person add [name]` — add contact
- `person [name]` — lookup contact
- `contacted [name]` — mark as contacted
- `birthdays` — upcoming birthdays
- `followups` — reconnection suggestions

**Kids:**
- `kids` — all kids' appointments this week
- `kid add [name]` — add a kid
- `[kidname] today/tomorrow/week` — kid's schedule

**Voice:**
- Send any voice message — transcribed and parsed as command

## Testing

```bash
# Test bot locally
npm run bot

# In Telegram, message your bot:
/start
task Test task tomorrow 30m
today
done [id]
```

## Notes

- Proton Calendar has no API — we poll ICS feeds (read-only)
- Voice uses OpenAI Whisper (~$0.006/minute)
- The bot auto-creates users on first message
- Kids are auto-tagged by matching keywords in event titles
