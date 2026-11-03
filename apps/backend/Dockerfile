# Medusa v2 backend. One image runs as server (MEDUSA_WORKER_MODE=server) and worker.
# Built in CI, never on the VPS. BuildKit required (cache mounts).
#
# Every stage runs as `node` and copies with --chown, so there is no recursive
# chown of node_modules at the end (that step alone took 222 s in the spike).

FROM node:22-alpine AS deps
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 \
    npm ci --no-audit --no-fund

FROM deps AS build
COPY --chown=node:node . .
# Admin is served same-origin at /app; leave MEDUSA_BACKEND_URL unset unless the
# admin is hosted on a different origin.
ARG MEDUSA_BACKEND_URL=
ENV MEDUSA_BACKEND_URL=${MEDUSA_BACKEND_URL}
ENV MEDUSA_DISABLE_TELEMETRY=true
RUN npx medusa build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    MEDUSA_DISABLE_TELEMETRY=true \
    PORT=9000
WORKDIR /app
RUN chown node:node /app
USER node
# Per the deployment docs: run from .medusa/server and install its prod deps.
COPY --chown=node:node --from=build /app/.medusa/server ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 \
    npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
EXPOSE 9000
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=10 \
  CMD wget -q -O /dev/null http://127.0.0.1:9000/health || exit 1
ENTRYPOINT ["/bin/sh", "/usr/local/bin/docker-entrypoint.sh"]
