#!/bin/sh
# Runs in the minio/mc image on every `up`. Creates the app buckets and makes
# them anonymous-download (objects readable, listing denied). Idempotent.
set -eu

: "${MINIO_ENDPOINT:?}" "${MINIO_ROOT_USER:?}" "${MINIO_ROOT_PASSWORD:?}" "${BUCKETS:?}"

i=0
until mc alias set local "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -gt 30 ] && { echo "minio not reachable at $MINIO_ENDPOINT" >&2; exit 1; }
  sleep 2
done

for bucket in $BUCKETS; do
  mc mb --ignore-existing "local/$bucket"
  mc anonymous set download "local/$bucket"
  echo "bucket $bucket ready (anonymous download)"
done
