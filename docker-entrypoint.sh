#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy

echo "[entrypoint] Copying web static files to shared volume..."
cp -r /app/web-static/* /srv/static/ 2>/dev/null || echo "[entrypoint] No static files to copy"

echo "[entrypoint] Starting API server..."
node dist/api/index.js &
API_PID=$!

echo "[entrypoint] Starting cron + bot..."
node dist/scripts/run-cron.js &
CRON_PID=$!

# Graceful shutdown
shutdown() {
  echo "[entrypoint] Shutting down..."
  kill "$API_PID" "$CRON_PID" 2>/dev/null
  wait "$API_PID" "$CRON_PID" 2>/dev/null
  exit 0
}

trap shutdown SIGTERM SIGINT

echo "[entrypoint] All processes started"
wait
