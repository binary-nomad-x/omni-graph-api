#!/usr/bin/env bash
# db:backup — Backup the PostgreSQL database to a timestamped file.
#
# Usage:
#   bash scripts/misc/db-backup.sh
#   npm run db:backup
#
# Requires DATABASE_URL in .env.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables from .env if present
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set in .env" >&2
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "Backing up database to $BACKUP_FILE ..."

pg_dump "$DATABASE_URL" \
  --format=plain \
  --compress=0 \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --create \
  > "$BACKUP_FILE"

echo "Backup complete: $BACKUP_FILE"
echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
