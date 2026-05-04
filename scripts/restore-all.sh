#!/usr/bin/env bash

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: ./scripts/restore-all.sh path/to/gradeflow-full-backup.tar.gz"
  echo "   or: ./scripts/restore-all.sh path/to/unpacked-backup-folder"
  exit 1
fi

SOURCE="$1"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

TMP_DIR=""

cleanup() {
  if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

trap cleanup EXIT

if [ -d "$SOURCE" ]; then
  BACKUP_DIR="$SOURCE"
elif [ -f "$SOURCE" ]; then
  TMP_DIR="$(mktemp -d)"
  tar -xzf "$SOURCE" -C "$TMP_DIR"
  BACKUP_DIR="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
else
  echo "Backup source not found: $SOURCE"
  exit 1
fi

DB_BACKUP="$BACKUP_DIR/database.sql"
MINIO_BACKUP="$BACKUP_DIR/minio.tar.gz"

if [ ! -f "$DB_BACKUP" ]; then
  echo "Missing database backup: $DB_BACKUP"
  exit 1
fi

if [ ! -f "$MINIO_BACKUP" ]; then
  echo "Missing MinIO backup: $MINIO_BACKUP"
  exit 1
fi

echo "Full GradeFlow restore"
echo "Backup folder: $BACKUP_DIR"
echo ""
echo "This will replace:"
echo "- PostgreSQL database data"
echo "- MinIO uploaded files"
echo ""
echo "Type RESTORE to continue:"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Starting db/minio containers..."
docker compose -f "$COMPOSE_FILE" up -d db minio

echo "Stopping backend/frontend before restore..."
docker compose -f "$COMPOSE_FILE" stop backend frontend >/dev/null 2>&1 || true

SKIP_CONFIRM=true COMPOSE_FILE="$COMPOSE_FILE" ./scripts/restore-db.sh "$DB_BACKUP"
SKIP_CONFIRM=true COMPOSE_FILE="$COMPOSE_FILE" ./scripts/restore-minio.sh "$MINIO_BACKUP"

echo "Starting full stack..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "Full restore completed successfully."
