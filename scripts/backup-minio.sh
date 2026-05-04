#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
MINIO_SERVICE="${MINIO_SERVICE:-minio}"
BACKUP_DIR="${BACKUP_DIR:-backups}"

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
BACKUP_FILE="${BACKUP_FILE:-$BACKUP_DIR/gradeflow-minio-$TIMESTAMP.tar.gz}"

mkdir -p "$(dirname "$BACKUP_FILE")"

MINIO_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -q "$MINIO_SERVICE")"

if [ -z "$MINIO_CONTAINER" ]; then
  echo "MinIO container was not found. Start it first:"
  echo "docker compose up -d minio"
  exit 1
fi

echo "Creating MinIO backup..."
echo "Compose file: $COMPOSE_FILE"
echo "MinIO service: $MINIO_SERVICE"
echo "Output: $BACKUP_FILE"

docker run --rm \
  --volumes-from "$MINIO_CONTAINER" \
  alpine:3.20 \
  tar -czf - -C /data . \
  > "$BACKUP_FILE"

echo ""
echo "MinIO backup created successfully:"
echo "$BACKUP_FILE"
