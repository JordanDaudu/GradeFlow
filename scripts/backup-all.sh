#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-backups}"

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
BACKUP_NAME="gradeflow-full-$TIMESTAMP"
BACKUP_DIR="$BACKUP_ROOT/$BACKUP_NAME"
ARCHIVE_FILE="$BACKUP_ROOT/$BACKUP_NAME.tar.gz"

mkdir -p "$BACKUP_DIR"

restart_app() {
  docker compose -f "$COMPOSE_FILE" up -d backend frontend >/dev/null 2>&1 || true
}

trap restart_app EXIT

echo "Creating full GradeFlow backup..."
echo "Backup folder: $BACKUP_DIR"
echo ""

echo "Starting required services..."
docker compose -f "$COMPOSE_FILE" up -d db minio

echo "Stopping backend/frontend to prevent writes during backup..."
docker compose -f "$COMPOSE_FILE" stop backend frontend >/dev/null 2>&1 || true

BACKUP_FILE="$BACKUP_DIR/database.sql" COMPOSE_FILE="$COMPOSE_FILE" ./scripts/backup-db.sh
BACKUP_FILE="$BACKUP_DIR/minio.tar.gz" COMPOSE_FILE="$COMPOSE_FILE" ./scripts/backup-minio.sh

cat > "$BACKUP_DIR/manifest.txt" <<MANIFEST
GradeFlow full backup
Created: $TIMESTAMP

Files:
- database.sql   PostgreSQL dump
- minio.tar.gz   MinIO uploaded file storage archive

Restore:
./scripts/restore-all.sh $ARCHIVE_FILE
MANIFEST

tar -czf "$ARCHIVE_FILE" -C "$BACKUP_ROOT" "$BACKUP_NAME"

echo ""
echo "Full backup created successfully:"
echo "$ARCHIVE_FILE"
echo ""
echo "Unpacked folder:"
echo "$BACKUP_DIR"
