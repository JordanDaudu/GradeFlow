#!/usr/bin/env bash

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: ./scripts/restore-db.sh path/to/database.sql"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

get_env_value() {
  local key="$1"
  local default_value="$2"

  if [ -n "${!key:-}" ]; then
    printf "%s" "${!key}"
    return
  fi

  if [ -f ".env" ]; then
    local line
    line="$(grep -E "^${key}=" .env | tail -n 1 || true)"

    if [ -n "$line" ]; then
      local value="${line#*=}"
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      printf "%s" "$value"
      return
    fi
  fi

  printf "%s" "$default_value"
}

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="$(get_env_value POSTGRES_USER gradeflow)"
DB_NAME="$(get_env_value POSTGRES_DB gradeflow)"

echo "Database restore target:"
echo "Compose file: $COMPOSE_FILE"
echo "Database service: $DB_SERVICE"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

if [ "${SKIP_CONFIRM:-false}" != "true" ]; then
  echo "WARNING: This will replace database tables/data."
  echo "Type RESTORE to continue:"
  read -r CONFIRMATION

  if [ "$CONFIRMATION" != "RESTORE" ]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

cat "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" psql \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -v ON_ERROR_STOP=1

echo ""
echo "Database restore completed successfully from:"
echo "$BACKUP_FILE"
