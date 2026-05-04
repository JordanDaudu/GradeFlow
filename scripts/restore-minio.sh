#!/usr/bin/env bash

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: ./scripts/restore-minio.sh path/to/minio.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "MinIO backup file not found: $BACKUP_FILE"
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
MINIO_SERVICE="${MINIO_SERVICE:-minio}"

MINIO_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -aq "$MINIO_SERVICE")"

if [ -z "$MINIO_CONTAINER" ]; then
  echo "MinIO container was not found. Create it first:"
  echo "docker compose up -d minio"
  exit 1
fi

echo "MinIO restore target:"
echo "Compose file: $COMPOSE_FILE"
echo "MinIO service: $MINIO_SERVICE"
echo "Backup file: $BACKUP_FILE"
echo ""

if [ "${SKIP_CONFIRM:-false}" != "true" ]; then
  echo "WARNING: This will replace all current MinIO uploaded files."
  echo "Type RESTORE to continue:"
  read -r CONFIRMATION

  if [ "$CONFIRMATION" != "RESTORE" ]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

docker compose -f "$COMPOSE_FILE" stop backend frontend "$MINIO_SERVICE" >/dev/null 2>&1 || true

cat "$BACKUP_FILE" | docker run --rm -i \
  --volumes-from "$MINIO_CONTAINER" \
  alpine:3.20 \
  sh -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -xzf - -C /data'

docker compose -f "$COMPOSE_FILE" up -d "$MINIO_SERVICE"

echo ""
echo "MinIO restore completed successfully from:"
echo "$BACKUP_FILE"
