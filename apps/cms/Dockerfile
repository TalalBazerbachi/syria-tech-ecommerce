# Strapi v5 production image, following Strapi's documented multi-stage pattern
# (docs.strapi.io/cms/installation/docker). Built in CI, never on the VPS.

FROM node:22-alpine AS build
# sharp needs vips; the rest is for native modules
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git python3
ENV NODE_ENV=production
WORKDIR /opt/app
RUN chown node:node /opt/app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 \
    npm ci --include=dev --no-audit --no-fund
COPY --chown=node:node . .
RUN npm run build \
 && npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime
RUN apk add --no-cache vips-dev wget
ENV NODE_ENV=production \
    STRAPI_TELEMETRY_DISABLED=true
WORKDIR /opt/app
RUN chown node:node /opt/app
USER node
COPY --chown=node:node --from=build /opt/app ./
EXPOSE 1337
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=12 \
  CMD wget -q -O /dev/null http://127.0.0.1:1337/_health || exit 1
CMD ["npm", "run", "start"]
