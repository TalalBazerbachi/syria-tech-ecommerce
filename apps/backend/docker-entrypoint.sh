#!/bin/sh
set -e
# The server container owns schema migrations; the worker starts only after the
# server is healthy (compose depends_on), so it never races the migration.
if [ "${MEDUSA_WORKER_MODE:-shared}" = "server" ]; then
  echo "[entrypoint] MEDUSA_WORKER_MODE=server: running medusa db:migrate"
  ./node_modules/.bin/medusa db:migrate
fi
exec ./node_modules/.bin/medusa start
