#!/bin/bash
# TaskFlow database backup script
# Usage: ./scripts/backup-db.sh
# Cron example (daily at 3am): 0 3 * * * /path/to/taskflow/scripts/backup-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[backup] Dumping database..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres \
  pg_dump -U taskflow taskflow | gzip > "$BACKUP_DIR/taskflow_$TIMESTAMP.sql.gz"

echo "[backup] Saved: backups/taskflow_$TIMESTAMP.sql.gz"

# Rotate old backups
echo "[backup] Removing backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "taskflow_*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "[backup] Done"
