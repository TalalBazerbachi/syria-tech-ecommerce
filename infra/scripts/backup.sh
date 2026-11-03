#!/usr/bin/env bash
# Nightly backup: pg_dump of both databases + mirror of both MinIO buckets + .env,
# staged under $BACKUP_DIR then pushed to a restic repository (RESTIC_REPOSITORY /
# RESTIC_PASSWORD in .env, e.g. a Hetzner Storage Box over sftp).
#
#   ./scripts/backup.sh            # run once
#   crontab: 30 2 * * * cd /opt/syria-tech-ecommerce/infra && ./scripts/backup.sh >> /var/log/syria-backup.log 2>&1
#
# Restore steps: docs/runbook.md ("Restore").
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=lib.sh
. scripts/lib.sh
load_env

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is empty in .env}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD is empty in .env}"
BACKUP_DIR=${BACKUP_DIR:-/var/backups/$PROJECT}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
WORK="$BACKUP_DIR/stage"

# restic: host binary, else the official image (needs network access to the repo)
if command -v restic >/dev/null; then
  RESTIC=(restic)
else
  RESTIC=(docker run --rm -e RESTIC_REPOSITORY -e RESTIC_PASSWORD -v "$BACKUP_DIR:$BACKUP_DIR" -v "$HOME/.ssh:/root/.ssh:ro" restic/restic:0.18.0)
fi

rm -rf "$WORK"
mkdir -p "$WORK/db" "$WORK/minio"
chmod 700 "$BACKUP_DIR" "$WORK"

log "pg_dump medusa + strapi (custom format) and roles"
for db in medusa strapi; do
  $DC exec -T postgres pg_dump -U postgres -Fc --no-owner "$db" > "$WORK/db/$db.dump"
done
$DC exec -T postgres pg_dumpall -U postgres --globals-only > "$WORK/db/globals.sql"

log "mirror MinIO buckets"
# Runs mc inside the compose network (MinIO publishes no ports). --remove keeps the
# mirror an exact copy; restic snapshots keep history.
$DC run --rm -T -v "$WORK/minio:/backup" --entrypoint /bin/sh minio-init -c '
  mc alias set local "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null &&
  for b in $BUCKETS; do mc mirror --overwrite --remove --quiet "local/$b" "/backup/$b"; done'

cp "$ENV_FILE" "$WORK/env.$STAMP"

log "restic backup -> $RESTIC_REPOSITORY"
"${RESTIC[@]}" snapshots >/dev/null 2>&1 || "${RESTIC[@]}" init
"${RESTIC[@]}" backup "$WORK" --tag "$PROJECT" --tag "$STAMP"
"${RESTIC[@]}" forget --tag "$PROJECT" --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

log "backup done ($STAMP)"
