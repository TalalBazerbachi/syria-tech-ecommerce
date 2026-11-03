#!/usr/bin/env bash
# First-deploy bootstrap. Idempotent: rerun any time; every step checks before it acts.
#
#   A. postgres, redis, minio, strapi -> Strapi admin user (SEO CMS; nothing else to wire up,
#      Strapi and Medusa do not talk to each other)
#   B. medusa-server + medusa-worker -> migrations ran on boot -> seed (idempotent) -> Medusa
#      admin user -> publishable key "Storefront" -> written to .env as MEDUSA_PUBLISHABLE_KEY
#   C. storefront + caddy (both read MEDUSA_PUBLISHABLE_KEY from .env)
#
# Usage:   ./scripts/bootstrap.sh            (production: pulls GHCR images)
#          DEV=1 ./scripts/bootstrap.sh      (dev override: local builds, localhost ports)
#          SKIP_FRONT=1 ...                   (don't start storefront/caddy, e.g. while the
#                                             storefront app is still being built)
#          NO_BUILD=1 DEV=1 ...               (dev without rebuilding images)
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=lib.sh
. scripts/lib.sh
command -v node >/dev/null || die "node is required on the host (for JSON parsing)"
load_env

for v in MEDUSA_ADMIN_EMAIL MEDUSA_ADMIN_PASSWORD STRAPI_ADMIN_EMAIL STRAPI_ADMIN_PASSWORD MINIO_ROOT_USER MINIO_ROOT_PASSWORD; do
  [ -n "${!v:-}" ] || die "$v is empty in $ENV_FILE"
done

BUILD_FLAG=""
[ "${DEV:-0}" = "1" ] && [ "${NO_BUILD:-0}" != "1" ] && BUILD_FLAG="--build"

log "Phase A: postgres, redis, minio, strapi"
# shellcheck disable=SC2086
$DC up -d $BUILD_FLAG postgres redis minio minio-init strapi
wait_healthy postgres 120
wait_healthy strapi 300

log "Strapi: ensuring admin user ${STRAPI_ADMIN_EMAIL}"
$DC exec -T strapi node_modules/.bin/strapi admin:create-user \
  --firstname=Store --lastname=Admin --email="$STRAPI_ADMIN_EMAIL" --password="$STRAPI_ADMIN_PASSWORD" >/dev/null 2>&1 \
  || log "Strapi admin user already exists (ok)"
# Locales (en, ar) and the Public role's read access to the four SEO types are
# created by Strapi itself on boot (apps/cms/src/index.ts). No API token is needed.

log "Phase B: medusa-server + medusa-worker"
# shellcheck disable=SC2086
$DC up -d $BUILD_FLAG medusa-server medusa-worker
wait_healthy medusa-server 600
wait_healthy medusa-worker 300

log "Medusa: seed (idempotent)"
$DC exec -T medusa-server ./node_modules/.bin/medusa exec ./src/scripts/seed.js

log "Medusa: ensuring admin user ${MEDUSA_ADMIN_EMAIL}"
$DC exec -T medusa-server ./node_modules/.bin/medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" >/dev/null 2>&1 \
  || log "Medusa admin user already exists (ok)"

MEDUSA=http://127.0.0.1:9000
if [ -z "${MEDUSA_PUBLISHABLE_KEY:-}" ]; then
  AUTH=$(http_json medusa-server POST "$MEDUSA/auth/user/emailpass" "" "{\"email\":\"$MEDUSA_ADMIN_EMAIL\",\"password\":\"$MEDUSA_ADMIN_PASSWORD\"}")
  MJWT=$(json_get "$AUTH" token)
  [ -n "$MJWT" ] || die "Medusa admin login failed: $AUTH"
  KEYS=$(http_json medusa-server GET "$MEDUSA/admin/api-keys?type=publishable&limit=50" "$MJWT")
  PK=$(node -e 'const d=JSON.parse(process.argv[1]).api_keys||[];const k=d.find(x=>x.title==="Storefront")||d[0];if(k)process.stdout.write(k.token)' "$KEYS")
  [ -n "$PK" ] || die "no publishable API key found; did the seed run? $KEYS"
  setenv MEDUSA_PUBLISHABLE_KEY "$PK"
  log "Publishable key $(mask "$PK") -> .env MEDUSA_PUBLISHABLE_KEY (the storefront reads it from there)"
else
  log "Publishable key already in .env (skip)"
fi

if [ "${SKIP_FRONT:-0}" = "1" ]; then
  log "SKIP_FRONT=1: not starting storefront/caddy"
else
  log "Phase C: storefront + caddy"
  # shellcheck disable=SC2086
  $DC up -d $BUILD_FLAG storefront caddy
fi

log "bootstrap done"
$DC ps
