#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_CONTAINER="${DB_CONTAINER:-voc-db}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-dscdb_uploads}"

mkdir -p "$BACKUP_DIR"

docker exec "$DB_CONTAINER" pg_dump -U "${POSTGRES_USER:-voc_user}" "${POSTGRES_DB:-vocs_db}" > "$BACKUP_DIR/vocs_db_$TIMESTAMP.sql"
docker run --rm -v "$UPLOADS_VOLUME:/uploads:ro" -v "$BACKUP_DIR:/backups" alpine tar -czf "/backups/uploads_$TIMESTAMP.tar.gz" -C /uploads .

find "$BACKUP_DIR" -type f -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
