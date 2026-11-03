# syntax=docker/dockerfile:1.7
#
# Syria Tech storefront — Next.js 15 standalone output on node:22-alpine.
#
# The image is built in CI with nothing environment-specific baked in.
# Next.js inlines NEXT_PUBLIC_* at build time (server code included), so the
# build args below only carry environment-independent defaults (locale ar,
# region sy). Everything else is read by the Next.js server at runtime under
# plain names set by docker-compose: MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY,
# BASE_URL, STRAPI_URL, STRAPI_READ_TOKEN, STRAPI_MEDIA_URL. The browser never
# needs the publishable key: Caddy adds it to /store/* requests.

ARG NODE_IMAGE=node:22-alpine

# ---- deps -------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=""
ARG NEXT_PUBLIC_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_DEFAULT_LOCALE=ar
ARG NEXT_PUBLIC_DEFAULT_REGION=sy
ARG NEXT_PUBLIC_MEDIA_HOSTNAME=""
ARG NEXT_PUBLIC_STRAPI_MEDIA_URL=""

ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_MEDUSA_BACKEND_URL=${NEXT_PUBLIC_MEDUSA_BACKEND_URL} \
    NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
    NEXT_PUBLIC_DEFAULT_LOCALE=${NEXT_PUBLIC_DEFAULT_LOCALE} \
    NEXT_PUBLIC_DEFAULT_REGION=${NEXT_PUBLIC_DEFAULT_REGION} \
    NEXT_PUBLIC_MEDIA_HOSTNAME=${NEXT_PUBLIC_MEDIA_HOSTNAME} \
    NEXT_PUBLIC_STRAPI_MEDIA_URL=${NEXT_PUBLIC_STRAPI_MEDIA_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN pnpm build

# ---- runtime ----------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
# Legal pages and the homepage hero are read from disk at request time
# (src/lib/data/content.ts); the standalone tracer does not know about them.
COPY --from=build --chown=nextjs:nodejs /app/content ./content

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ar >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
