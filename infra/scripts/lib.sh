# Shared helpers for infra/scripts/*. Source from a script that already cd'ed to infra/.
# shellcheck shell=bash

PROJECT=syria-tech-ecommerce
ENV_FILE=.env

# DEV=1 adds the dev override (local builds, published localhost ports)
compose_files() {
  if [ "${DEV:-0}" = "1" ]; then
    echo "-f docker-compose.yml -f docker-compose.dev.yml"
  else
    echo "-f docker-compose.yml"
  fi
}
DC="docker compose -p $PROJECT $(compose_files)"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

load_env() {
  [ -f "$ENV_FILE" ] || die "$ENV_FILE not found. cp .env.example .env and fill the secrets."
  set -a
  # shellcheck disable=SC1090
  . "./$ENV_FILE"
  set +a
}

# setenv KEY VALUE -> upsert into .env (portable sed)
setenv() {
  local key=$1 value=$2 tmp
  tmp=$(mktemp)
  if grep -q "^${key}=" "$ENV_FILE"; then
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k {print k"="v; next} {print}' "$ENV_FILE" > "$tmp"
  else
    cat "$ENV_FILE" > "$tmp"; printf '%s=%s\n' "$key" "$value" >> "$tmp"
  fi
  cat "$tmp" > "$ENV_FILE"; rm -f "$tmp"
  export "$key=$value"
}

# wait_healthy SERVICE [TIMEOUT_SECONDS]
wait_healthy() {
  local svc=$1 timeout=${2:-600} waited=0 cid status
  while :; do
    cid=$($DC ps -q "$svc" 2>/dev/null | head -1)
    status=$([ -n "$cid" ] && docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo none)
    if [ "$status" = healthy ]; then log "$svc healthy after ${waited}s"; return 0; fi
    if [ "$waited" -ge "$timeout" ]; then
      echo "$svc not healthy after ${timeout}s (status: $status)" >&2
      $DC logs --tail 60 "$svc" >&2 || true
      return 1
    fi
    sleep 5; waited=$((waited + 5))
  done
}

# http_json SERVICE METHOD URL [BEARER_TOKEN] [JSON_BODY]
# Runs an HTTP call from inside a running container (node 22 fetch), so it works in
# production where nothing but Caddy is published. Prints the response body.
http_json() {
  local svc=$1 method=$2 url=$3 token=${4:-} body=${5:-}
  $DC exec -T -e "HJ_METHOD=$method" -e "HJ_URL=$url" -e "HJ_TOKEN=$token" -e "HJ_BODY=$body" "$svc" node -e '
    const h = { "content-type": "application/json" };
    if (process.env.HJ_TOKEN) h.authorization = "Bearer " + process.env.HJ_TOKEN;
    fetch(process.env.HJ_URL, { method: process.env.HJ_METHOD, headers: h, body: process.env.HJ_BODY || undefined })
      .then(async (r) => { process.stdout.write(await r.text()); if (r.status >= 500) process.exit(2); })
      .catch((e) => { console.error(e.message); process.exit(1); });'
}

# json_get '<json>' 'path.to.value'  (dot path, arrays by index)
json_get() {
  node -e '
    const [json, path] = process.argv.slice(1);
    let v; try { v = JSON.parse(json); } catch { process.exit(0); }
    for (const k of path.split(".")) { if (v == null) break; v = v[k]; }
    if (v === undefined || v === null) process.exit(0);
    process.stdout.write(typeof v === "string" ? v : JSON.stringify(v));' "$1" "$2"
}

mask() { local s=$1; [ "${#s}" -le 8 ] && { echo '****'; return; }; echo "${s:0:4}…${s: -4}"; }
