# TaskFlow

Self-hosted personal productivity hub for managing calendars, tasks, and contacts. Integrates multiple calendar providers (Google, Microsoft, Proton), features a Telegram bot with voice commands, and includes a web dashboard PWA.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React 19 + Vite, Tailwind CSS, PWA
- **Database**: PostgreSQL 16 + Prisma ORM
- **Bot**: Telegram (grammy) with OpenAI Whisper voice transcription
- **Calendar Sync**: Google Calendar API, Microsoft Graph API, Proton ICS
- **Deployment**: Docker + Caddy (auto SSL)

## Features

- **Multi-calendar aggregation** - Google, Microsoft/Exchange, Proton ICS with 15-min auto-sync
- **Telegram bot** - Task and schedule commands, voice message transcription
- **Task management** - Auto-scheduling, priorities, tags, status tracking
- **Personal CRM** - Contact tracking with birthdays, follow-ups, notes
- **Kids tracking** - Appointment management with event auto-tagging
- **Proactive reminders** - Birthday alerts, follow-up nudges, morning/evening briefings
- **Web dashboard** - React PWA with full CRUD for all resources

## Project Structure

```
src/
  api/                  # Express REST API
    routes/             # Auth, tasks, people, calendars, kids, reminders
    middleware/          # JWT auth, error handling
  bot/                  # Telegram bot (grammy)
    commands/           # Task, schedule, people, kids commands
    voice.ts            # Voice transcription
  services/             # Calendar sync, reminders, auth flows
  web/                  # React PWA (Vite)
    src/pages/          # Dashboard pages

prisma/
  schema.prisma         # Multi-tenant DB schema
```

## Getting Started

```bash
# Start PostgreSQL
docker compose up -d

# Install and setup
npm install
npm run db:migrate

# Run (three processes)
npm run dev           # API on :3000
npm run bot           # Telegram bot
npm run web           # Web UI on :5173
```

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Auth tokens
- `TELEGRAM_BOT_TOKEN` - Bot access
- `GOOGLE_CLIENT_ID/SECRET` - Google Calendar OAuth
- `MICROSOFT_CLIENT_ID/SECRET` - Microsoft Calendar OAuth
- `OPENAI_API_KEY` - Voice transcription

## Deployment

Production setup uses Docker Compose with Caddy for automatic SSL:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## License

Proprietary
