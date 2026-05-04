#!/usr/bin/env bash

set -euo pipefail

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
BACKUP_DIR="${BACKUP_DIR:-backups}"

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
BACKUP_FILE="${BACKUP_FILE:-$BACKUP_DIR/gradeflow-db-$DB_NAME-$TIMESTAMP.sql}"

mkdir -p "$(dirname "$BACKUP_FILE")"

echo "Creating PostgreSQL backup..."
echo "Compose file: $COMPOSE_FILE"
echo "Database service: $DB_SERVICE"
echo "Database: $DB_NAME"
echo "Output: $BACKUP_FILE"

docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > "$BACKUP_FILE"

echo ""
echo "Database backup created successfully:"
echo "$BACKUP_FILE"
