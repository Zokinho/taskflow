# CLAUDE.md — TaskFlow

A personal productivity hub: calendars, tasks, contacts, and Telegram control.

## Project Overview

TaskFlow is a self-hosted productivity system that combines:
- Multi-calendar aggregation (Google, Microsoft, Exchange, Proton)
- Task management with auto-scheduling
- Personal CRM (people tracker with birthdays, notes, follow-up reminders)
- Kids' appointment tracking
- Telegram bot with voice support and inline keyboards
- Web dashboard (React PWA)

Target user: Busy parent juggling multiple calendars who values privacy.

## Tech Stack

- **Backend:** Node.js + Express 5 + TypeScript
- **Database:** PostgreSQL + Prisma 6
- **Telegram Bot:** grammy (inline keyboards, voice)
- **Voice:** OpenAI gpt-4o-mini-transcribe
- **Calendar APIs:** googleapis, Microsoft Graph (direct HTTP)
- **ICS Parsing:** node-ical (for Proton)
- **Web App:** React 19 + Vite + Tailwind v4 + TanStack Query + React Router v7
- **Background Jobs:** node-cron
- **Reverse Proxy:** Caddy (auto-SSL)
- **Hosting:** Hetzner VPS, Docker Compose

## Project Structure

```
taskflow/
├── prisma/
│   └── schema.prisma              # Database schema (8 models + enums)
├── src/
│   ├── api/
│   │   ├── index.ts               # Express setup, routes, middleware
│   │   ├── routes/
│   │   │   ├── auth.ts            # JWT auth (register, login, refresh)
│   │   │   ├── tasks.ts           # Task CRUD
│   │   │   ├── people.ts          # People CRUD + contacted
│   │   │   ├── calendars.ts       # Calendar CRUD + Google/Microsoft OAuth + sync
│   │   │   ├── kids.ts            # Kids CRUD + events
│   │   │   └── reminders.ts       # Reminders API + Telegram link/unlink
│   │   └── middleware/
│   │       ├── auth.ts            # JWT verification, token generation
│   │       └── errorHandler.ts    # AppError, asyncHandler, Prisma/Zod error mapping
│   ├── bot/
│   │   ├── index.ts               # Bot entry (commands, voice, text, /menu)
│   │   ├── callbacks.ts           # Inline keyboard callback handler
│   │   ├── dispatcher.ts          # Command routing with pattern matching
│   │   ├── middleware.ts           # resolveUser(chatId)
│   │   ├── voice.ts               # Voice-to-text transcription
│   │   ├── helpers/
│   │   │   ├── keyboards.ts       # InlineKeyboard factory functions
│   │   │   ├── format.ts          # Message formatting (tasks, events, people, kids)
│   │   │   └── date-parser.ts     # chrono-node wrapping, timezone-aware ranges
│   │   └── commands/
│   │       ├── tasks.ts           # task/done/defer/delete/note/tasks/autoschedule
│   │       ├── schedule.ts        # today/tomorrow/week/free/dayname
│   │       ├── people.ts          # person add/lookup, contacted, birthdays, followups
│   │       └── kids.ts            # kids, kid add, [kidname] schedule
│   ├── services/
│   │   ├── auto-scheduler.ts      # Greedy task auto-scheduling into free slots
│   │   ├── calendar-sync.ts       # Google/Microsoft/Proton sync + kid auto-tagging
│   │   ├── google-auth.ts         # Google OAuth2 helpers
│   │   ├── microsoft-auth.ts      # Microsoft OAuth2 (direct HTTP)
│   │   ├── telegram.ts            # grammy Bot singleton + message sender
│   │   ├── reminders.ts           # Reminder generators + delivery
│   │   └── task-defer.ts          # Per-user timezone-aware auto-defer
│   ├── scripts/
│   │   └── run-cron.ts            # node-cron job runner (6 jobs)
│   ├── lib/
│   │   └── prisma.ts              # Prisma client singleton
│   └── web/                       # React PWA (separate package.json)
│       ├── src/
│       │   ├── components/        # UI components, modals, forms
│       │   ├── pages/             # Login, Register, Dashboard, Tasks, People, etc.
│       │   ├── hooks/             # TanStack Query hooks, auth, calendar items
│       │   └── lib/               # API client, auth context
│       └── vite.config.ts         # Vite + PWA config
├── Dockerfile                     # 4-stage build (deps, web, api, production)
├── docker-compose.yml             # Local dev (PostgreSQL)
├── docker-compose.prod.yml        # Production (postgres, app, caddy)
├── Caddyfile                      # Reverse proxy config
├── docker-entrypoint.sh           # Migration + static copy + process start
├── scripts/
│   ├── deploy.sh                  # rsync + docker compose up
│   └── backup-db.sh              # pg_dump + gzip + 7-day rotation
├── .env.example                   # Dev environment template
└── .env.prod.example              # Production environment template
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (uses port 5433)
sudo docker-compose up -d

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Run database migrations
npx prisma migrate dev

# 5. Start development
npm run dev          # API server (terminal 1)
npm run bot          # Telegram bot (terminal 2)
npm run web          # Web app (terminal 3)
npm run cron         # Background jobs (terminal 4)
```

## Database Schema

Defined in `prisma/schema.prisma`. Key models:
- `User` — multi-tenant, stores Telegram chat ID, timezone, preferences
- `RefreshToken` — single-use JWT refresh tokens with rotation
- `Calendar` — connected calendars (Google, Microsoft, Proton ICS, Exchange) with sync tokens
- `CalendarEvent` — cached events with kid auto-tagging
- `Task` — tasks with priority, scheduling fields, estimated duration
- `Person` — CRM contacts with birthday, follow-up tracking, tags, notes
- `Kid` — children with keyword-based event auto-tagging
- `Reminder` — proactive messages (birthdays, follow-ups, briefings)

## Environment Variables

```
DATABASE_URL              # PostgreSQL connection
JWT_SECRET                # For auth tokens
TELEGRAM_BOT_TOKEN        # From @BotFather
OPENAI_API_KEY            # For voice transcription
GOOGLE_CLIENT_ID          # Google OAuth
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI       # e.g. https://taskflow.veloxia.ca/api/calendars/google/callback
MICROSOFT_CLIENT_ID       # Microsoft OAuth (via Entra)
MICROSOFT_CLIENT_SECRET
MICROSOFT_REDIRECT_URI    # e.g. https://taskflow.veloxia.ca/api/calendars/microsoft/callback
FRONTEND_URL              # e.g. https://taskflow.veloxia.ca
```

## Architecture Notes

- **Multi-tenant:** Every table has `userId` FK, all queries scoped by user
- **Auth:** bcrypt(12), 15min access tokens + 7-day refresh tokens with single-use rotation
- **Rate limiting:** 10 requests per 15 minutes on auth endpoints
- **Calendar sync:** Incremental (delta sync for Google/Microsoft, full re-fetch for ICS)
- **Auto-scheduler:** Greedy algorithm — sorts by priority then due date, places into first available slot within work hours over 7-day lookahead, 10-min buffer between tasks
- **Auto-defer:** Nightly cron at 00:15 moves overdue scheduled tasks to next day, per-user timezone
- **Telegram bot:** Pattern-based command dispatcher, inline keyboards with in-place message editing, voice via OpenAI transcription
- **Web PWA:** Pink theme, service worker with navigateFallbackDenylist for OAuth callbacks

## Cron Jobs (run-cron.ts)

| Schedule | Job |
|----------|-----|
| `0 5 0 * * *` | Generate birthday reminders (7-day lookahead) |
| `0 10 0 * * *` | Generate follow-up reminders |
| `0 0 6 * * *` | Morning briefing |
| `0 0 20 * * *` | Evening review |
| `*/5 * * * *` | Deliver pending reminders via Telegram |
| `*/15 * * * *` | Auto-sync all active calendars |
| `15 0 * * *` | Auto-defer overdue tasks |

## Commands Reference

### Telegram Bot Commands

**Tasks:**
- `task [title] [date] [duration]` — create task
- `tasks` — list open tasks
- `done [id]` — complete task
- `defer [id] [when]` — reschedule
- `delete [id]` — remove task
- `note [id] [text]` — add note
- `schedule tasks` / `autoschedule` — auto-schedule tasks into free slots

**Schedule:**
- `today` — today's schedule
- `tomorrow` — tomorrow's schedule
- `week` — week overview
- `free` — free time slots (8:00-18:00)
- `monday` .. `sunday` — specific day

**People:**
- `person add [name]` — add contact
- `person [name]` — lookup contact
- `contacted [name]` — mark as contacted
- `birthdays` — upcoming birthdays (30 days)
- `followups` — overdue follow-ups

**Kids:**
- `kids` — all kids' events this week
- `kid add [name]` — add a kid
- `[kidname] today/tomorrow/week` — kid's schedule

**Other:**
- `/menu` — main menu with inline keyboard buttons
- `/help` — command reference
- Send a voice message — transcribed and executed as command

## Deployment

```bash
# Deploy to VPS
./scripts/deploy.sh root@178.156.227.137

# Manual backup
ssh root@178.156.227.137 '/root/taskflow/scripts/backup-db.sh'
```

Production runs via `docker-compose.prod.yml` with three containers: postgres, app (API + bot + cron), and caddy (reverse proxy with auto-SSL).

## Known Gotchas

- Express 5 types make `req.params.id` typed as `string | string[]` — use a helper to extract as `string`
- PWA service worker intercepts OAuth callbacks — `navigateFallbackDenylist: [/^\/api\//]` required
- Express behind Caddy needs `trust proxy` — `app.set("trust proxy", 1)` or rate-limit crashes
- Docker `.env` files don't strip quotes — use `KEY=value` not `KEY="value"`
- Prisma JSON `path` filter with `equals: null` causes TS errors — filter in JS instead
- `new Date().setHours(0,0,0,0)` gives server-local midnight — always use `Intl.DateTimeFormat` with `timeZone`
- Microsoft `@azure/msal-node` doesn't expose refresh tokens — use direct HTTP to `/oauth2/v2.0/token`
