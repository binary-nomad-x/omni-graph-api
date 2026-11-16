#!/usr/bin/env bash
# db:restore — Restore the PostgreSQL database from a backup file.
#
# Usage:
#   bash scripts/misc/db-restore.sh <backup-file>
#   npm run db:restore
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

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: bash scripts/misc/db-restore.sh <backup-file>" >&2
  echo "Example: bash scripts/misc/db-restore.sh backups/backup_20250101_120000.sql" >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "Restoring database from $BACKUP_FILE ..."

psql "$DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  < "$BACKUP_FILE"

echo "Restore complete."
