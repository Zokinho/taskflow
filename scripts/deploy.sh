#!/bin/bash
# TaskFlow deployment script
#
# Prerequisites on the VPS:
#   - Ubuntu 24.04 (Hetzner CX22 or similar)
#   - Docker + Docker Compose installed
#   - UFW: allow 22, 80, 443
#   - A deploy user with docker group access
#
# Usage: ./scripts/deploy.sh user@your-vps-ip
#
# First-time setup on VPS:
#   1. ssh user@vps
#   2. mkdir -p ~/taskflow
#   3. Run this script to rsync files
#   4. cd ~/taskflow && cp .env.prod.example .env.prod
#   5. Edit .env.prod with your values
#   6. docker compose -f docker-compose.prod.yml up -d --build

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 user@host [remote-path]"
  echo "Example: $0 deploy@123.45.67.89"
  exit 1
fi

REMOTE="$1"
REMOTE_PATH="${2:-~/taskflow}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[deploy] Syncing project to $REMOTE:$REMOTE_PATH ..."
rsync -avz --delete \
  --exclude 'node_modules/' \
  --exclude 'src/web/node_modules/' \
  --exclude 'dist/' \
  --exclude 'src/web/dist/' \
  --exclude '.env' \
  --exclude '.env.prod' \
  --exclude 'backups/' \
  --exclude '.git/' \
  "$PROJECT_DIR/" "$REMOTE:$REMOTE_PATH/"

echo "[deploy] Building and starting containers..."
ssh "$REMOTE" "cd $REMOTE_PATH && docker compose -f docker-compose.prod.yml up -d --build"

echo "[deploy] Waiting for health check..."
sleep 5
ssh "$REMOTE" "curl -sf http://localhost/api/health && echo '' || echo '[deploy] Health check failed!'"

echo "[deploy] Done!"
