# TaskFlow — Remaining Setup

## OAuth Credentials (blocking calendar sync)
- [ ] Google Cloud Console — create OAuth 2.0 client ID, add redirect URI `https://taskflow.veloxia.ca/api/calendars/google/callback`
- [ ] Azure App Registrations — register app, add redirect URI `https://taskflow.veloxia.ca/api/calendars/microsoft/callback`
- [ ] Add `GOOGLE_CLIENT_ID` and `MICROSOFT_CLIENT_ID` to `.env.prod`, restart container

## User Onboarding
- [ ] Create Karinna's account via Admin panel
- [ ] Share login URL + credentials with her
- [ ] She links Telegram via Reminders page

## Nice to Have
- [ ] Set up database backups (`scripts/backup-db.sh` exists, needs cron on VPS)
- [ ] Monitor disk space / container health
