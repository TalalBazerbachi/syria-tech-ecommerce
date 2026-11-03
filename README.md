# Syria Tech Store

Online tech store for Syria: Medusa 2.21 (commerce, incl. all product text in `en` + `ar-SA`),
Strapi 5.58 (SEO content only: guides, landing pages, category/product SEO text, `en`/`ar`),
a Next.js storefront (Arabic default, RTL), all on one Docker Compose host behind Caddy.
Medusa and Strapi are not connected; Strapi entries name Medusa products/categories by handle.
USD at launch with cash on delivery; SYP is added later as a second region (no migration).

The build spec is [`docs/architecture.md`](docs/architecture.md). Operations live in
[`docs/runbook.md`](docs/runbook.md). What was tried first and what broke is in
[`docs/spike-report-2026-10-20.md`](docs/spike-report-2026-10-20.md).

## Layout

```
apps/backend     Medusa server + worker (one image, MEDUSA_WORKER_MODE switches)
                 src/scripts/seed.ts     idempotent launch seed (Syria/USD, zones, categories, 2 products)
                 src/data/governorates.ts ISO 3166-2:SY list shared with the storefront
                 src/api/middlewares.ts  store search index config; no Strapi code anywhere
apps/cms         Strapi, SEO content only: article, landing-page, category-seo, product-seo
                 (+ components faq-item, hero, richtext, product-grid, faq-list); i18n en/ar
apps/storefront  Next.js storefront (ar default + en)
infra/           docker-compose.yml (prod), docker-compose.dev.yml, Caddyfile(.dev),
                 docker/postgres-init, docker/minio-init, scripts/{bootstrap,backup,cod-checkout}.sh
docs/            architecture spec, spike report, runbook
.github/         build.yml (GHCR images), deploy.yml (SSH pull + up)
```

Runtime services: caddy, storefront, medusa-server, medusa-worker, strapi, postgres:17, redis:7,
minio (+ a one-shot `minio-init`). Only Caddy publishes ports in production.

## Run locally (5 commands)

Requires Docker Desktop (8 GB), Node 22 and `jq`.

```sh
cd infra
cp .env.example .env                 # then replace every "change-me" (openssl rand -base64 32)
DEV=1 SKIP_FRONT=1 ./scripts/bootstrap.sh   # builds images, starts the stack, seeds, writes the publishable key to .env
./scripts/cod-checkout.sh            # smoke test: a USD cash-on-delivery order to Damascus
docker compose -p syria-tech-ecommerce -f docker-compose.yml -f docker-compose.dev.yml ps
```

Then:

- Medusa admin: http://localhost:9000/app (credentials: `MEDUSA_ADMIN_EMAIL/PASSWORD` in `infra/.env`)
- Strapi admin: http://localhost:1337/admin (`STRAPI_ADMIN_EMAIL/PASSWORD`)
- MinIO console: http://localhost:9001; uploaded files are served from http://localhost:9002/<bucket>/...
- Store API: `curl -H "x-publishable-api-key: $MEDUSA_PUBLISHABLE_KEY" localhost:9000/store/regions`
- Arabic: add `-H "x-medusa-locale: ar-SA"` to any `/store` request.
- SEO content (Strapi, no token): `curl "localhost:1337/api/articles?locale=ar&populate=*"`, likewise
  `/api/landing-pages`, `/api/category-seos`, `/api/product-seos`. Only published entries come back.

## Strapi is the SEO CMS

Editors create in Strapi, per locale (`en` + `ar`, draft & publish): **articles** (guides,
comparisons, how-tos, news), **landing pages** (hero + sections), **category SEO** text and optional
**product SEO** text. An entry that is about a Medusa product or category carries that product's or
category's **handle**, typed by hand into a plain string field (`productHandle`, `categoryHandle`,
`relatedProductHandles`); the storefront joins by handle when it renders. Nothing is synced in either
direction, Medusa has no Strapi code, and the Public role's read access to published entries is all
the storefront needs (no API token).

If a host port is taken (a native Postgres on 5432, say), set `DEV_POSTGRES_PORT=15433` or another
`DEV_*_PORT` in `infra/.env` (list in `docker-compose.dev.yml`). `NO_BUILD=1` skips image rebuilds.

Drop `SKIP_FRONT=1` once `apps/storefront` builds; the whole site is then at http://localhost:8080 through Caddy (storefront direct on http://localhost:8001).

Without Docker, each app also runs on its own: `npm install && npm run dev` in `apps/backend`
(needs Postgres + Redis, see `medusa-config.ts`) and `apps/cms` (copy `.env.example`).

## Deploy

1. Push to `main`: `.github/workflows/build.yml` builds `apps/backend`, `apps/cms`, `apps/storefront`
   and pushes `ghcr.io/<owner>/syria-tech-ecommerce-<app>:<sha>` and `:latest`.
2. On the server (first time only): clone the repo to `/opt/syria-tech-ecommerce`, create
   `infra/.env` from the example with production values, run `./scripts/bootstrap.sh`.
   Full steps: [`docs/runbook.md`](docs/runbook.md).
3. Every later release: Actions -> **deploy** -> choose `staging` or `production` (optionally an
   image sha). It SSHes in and runs `docker compose pull && docker compose up -d`.
   A green build on `main` also auto-deploys `latest` to staging.

Never build images on the VPS.
