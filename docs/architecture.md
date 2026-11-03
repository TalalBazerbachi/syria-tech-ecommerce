# Architecture and build spec

Source of truth for how this store is built. The research behind every decision is in the plan document ("Syria Tech Store — Research & Plan", 2026-10-20) and in `docs/spike-report-2026-10-20.md`. When this file and code disagree, fix the code.

## Decisions (as of 2026-10-20)

| Topic | Decision |
| --- | --- |
| Commerce engine | Medusa 2.21.x (pinned exact; upgrade deliberately, run integration checks first) |
| CMS | Strapi 5.58.x Community Edition, Postgres. **SEO content only** (decided 2026-10-20): guides and articles, SEO landing pages, category SEO text, optional per-product SEO text. Not connected to Medusa in any way. |
| Storefront | Next.js, started from `medusajs/dtc-starter` storefront, Arabic (`ar`) default + English (`en`), RTL |
| Checkout currency | **USD at launch.** SYP must be addable later as a second region with no countries (tested, no migration). All custom code is currency-aware: never assume USD, never hard-code `$`. |
| Payments at launch | Cash on delivery via Medusa's built-in `pp_system_default` (authorize at checkout, capture after courier remits cash) |
| Payments later | ShamCash official merchant API as a custom payment provider (phase 3); cards when a Syrian acquirer offers online payments |
| Delivery | Manual fulfillment provider. One service zone per governorate (ISO 3166-2 province codes, e.g. `sy-di`). Launch zones: Damascus (`sy-di`) and Rif Dimashq (`sy-rd`). Couriers handled by staff. |
| Arabic product text | All product text (titles, subtitles, descriptions, option names, category names, shipping option names) in **Medusa's Translation module** (`MEDUSA_FF_TRANSLATION=true`). Descriptions may contain markdown; the storefront renders it. Medusa has no plain `ar` locale: use `ar-SA` as the Arabic locale everywhere. |
| SEO content | Strapi with native i18n (`en`, `ar`), draft & publish. Records that are about a Medusa product or category carry its **handle** as a plain string field; the storefront joins by handle at render time. |
| Medusa ↔ Strapi sync | **None.** No module, subscriber, webhook, link or token between them. Medusa does not know Strapi exists. |
| Legal and editorial pages (warranty, returns, delivery, about, contact) | Markdown files in the storefront repo, one per locale (`apps/storefront/content/<locale>/<slug>.md`), rendered at `/[locale]/pages/[slug]`. |
| Homepage hero and banners | `apps/storefront/content/home.<locale>.json` (hero text, image, CTA link) plus a Medusa collection `featured` for the product grid. If ops later needs to change the hero without a deploy, add a small Medusa settings module with an admin widget. |
| Filterable specs | Later: a small custom Medusa module linked to products. Not in phase 1. |
| Search | Medusa Search Module (Postgres provider) first; Meilisearch only if Arabic relevance or facets fall short |
| Files | MinIO container (S3-compatible) shared by Medusa (S3 file provider, `forcePathStyle`) and Strapi (S3 upload provider) |
| Hosting | One Hetzner Cloud VPS in Germany, 8 GB / 4 vCPU, Docker Compose, Caddy reverse proxy, Cloudflare (free) in front. Staging = a second smaller VPS running the same Compose file. |
| Images | Built in GitHub Actions, pushed to GHCR, pulled by the server. Never build on the VPS. |
| Database | Postgres 17, one instance, separate `medusa` and `strapi` databases and roles. `sslmode=disable` on the internal network (Medusa 2.21.2 ignores the documented `ssl_mode=disable`). |
| Redis | Backs Medusa event bus, workflow engine, caching and locking |
| Backups | Nightly `pg_dump` of both databases + MinIO bucket to a Hetzner Storage Box via restic; monthly restore test |
| Staff roles | Medusa RBAC is Enterprise-licensed since 2026-08-11. Free Medusa = every admin is a full admin. Keep few admin accounts. |
| Messaging | WhatsApp via `wa.me` links (Business Platform unavailable for Syria); SMS via a local gateway behind a provider interface; Telegram bot later; email via Postmark/Resend/Brevo billed outside Syria |

## Repository layout

```
apps/backend     Medusa server + worker (same image, MEDUSA_WORKER_MODE switches)
apps/cms         Strapi
apps/storefront  Next.js storefront
infra/           docker-compose.yml (prod), docker-compose.dev.yml, Caddyfile, postgres init, scripts
docs/            this spec, spike report, runbooks
.github/         CI: build + push images, deploy
```

## Runtime services (docker-compose, project name `syria-tech-ecommerce`)

| Service | Image | Notes |
| --- | --- | --- |
| caddy | caddy:2 | Only service publishing ports (80/443). Routes: store → storefront, `/app` + `/admin` + `/store` + `/webhooks` → medusa-server, `cms.` subdomain → strapi. In dev, plain HTTP on localhost ports. |
| storefront | apps/storefront | Next.js, calls medusa-server and strapi over the compose network |
| medusa-server | apps/backend | `MEDUSA_WORKER_MODE=server`, serves admin at `/app`, runs `db:migrate` on start |
| medusa-worker | apps/backend | `MEDUSA_WORKER_MODE=worker`, `DISABLE_MEDUSA_ADMIN=true`, starts after server is healthy |
| strapi | apps/cms | `NODE_ENV=production`, healthcheck `/_health`. SEO content only; talks to nothing but its database and MinIO. |
| postgres | postgres:17-alpine | init script creates both DBs/roles |
| redis | redis:7-alpine | AOF on, `noeviction` |
| minio | minio/minio | one bucket per app; public-read for product media |

No database, Redis or MinIO ports are published in production. Healthchecks on every service; `depends_on` with `service_healthy`.

## Seed data (idempotent script, `apps/backend/src/scripts/seed.ts`)

- Store currencies: `usd` (default). Do **not** seed `syp`.
- Region `Syria`: currency `usd`, country `sy`, payment provider `pp_system_default`.
- Sales channel `Default Sales Channel`; publishable API key for the storefront.
- Stock location `Damascus Warehouse` (address in Damascus).
- Fulfillment set `Syria delivery` with service zones:
  - `Damascus` → geo zone `province` `sy-di`
  - `Rif Dimashq` → geo zone `province` `sy-rd`
  - (other governorates are added later; keep the full list in `apps/backend/src/data/governorates.ts`)
- Shipping option per launch zone, provider `manual_manual`, type `Courier`, flat USD price (placeholder amounts; staff adjust in admin).
- Product categories for a tech store (Laptops, Accessories, Peripherals, Networking, Storage, Audio) with Arabic translations via the Translation module.
- Two sample products priced in USD only, with Arabic translations.
- Arabic translations use locale `ar-SA`.

## Governorates (ISO 3166-2:SY) — used by seed, address form and zones

SY-DI Damascus دمشق · SY-RD Rif Dimashq ريف دمشق · SY-HL Aleppo حلب · SY-HI Homs حمص · SY-HM Hama حماة · SY-LA Latakia اللاذقية · SY-TA Tartus طرطوس · SY-ID Idlib إدلب · SY-DR Daraa درعا · SY-SU As-Suwayda السويداء · SY-QU Quneitra القنيطرة · SY-DY Deir ez-Zor دير الزور · SY-RA Raqqa الرقة · SY-HA Al-Hasakah الحسكة

## Address form → Medusa address fields

| Field | Required | Medusa field |
| --- | --- | --- |
| Phone (`09XXXXXXXX` → `+9639XXXXXXXX`) | yes | `phone` |
| Governorate (dropdown of ISO codes) | yes | `province` (lowercase, e.g. `sy-di`) |
| City / area | yes | `city` |
| Neighbourhood, street, building, floor | no | `address_1` |
| Nearest landmark | encouraged | `address_2` |
| Delivery notes | no | `metadata.notes` |
| `postal_code` | never shown | empty |
| Country | fixed | `sy` |

## Strapi content types (SEO only)

All types: i18n enabled (`en`, `ar`), draft & publish on. Localized fields are marked (L). Handles are plain strings copied from Medusa, never relations and never synced.

- `article`: `slug` (L, uid from title), `title` (L), `excerpt` (L), `body` (L, richtext/markdown), `cover` (media), `kind` (enum: `guide`, `comparison`, `howto`, `news`), `seoTitle` (L), `seoDescription` (L), `relatedProductHandles` (JSON array of Medusa product handles), `relatedCategoryHandle` (string), `faq` (L, repeatable component `faq-item`).
- `landing-page`: `slug` (L, uid), `title` (L), `seoTitle` (L), `seoDescription` (L), `noindex` (boolean), `hero` (L, component: `heading`, `text`, `image`, `ctaLabel`, `ctaHref`), `sections` (L, dynamic zone of components: `richtext` {body}, `product-grid` {heading, collectionHandle, productHandles JSON}, `faq-list` {items: faq-item[]}).
- `category-seo`: `categoryHandle` (string, unique, not localized), `intro` (L, richtext), `seoTitle` (L), `seoDescription` (L), `faq` (L, faq-item[]).
- `product-seo`: `productHandle` (string, unique, not localized), `longDescription` (L, richtext), `seoTitle` (L), `seoDescription` (L), `faq` (L, faq-item[]).
- Component `faq-item`: `question`, `answer`.
- Public role: `find` and `findOne` on the four types. Strapi 5 honours `?status=draft` even for the Public role, so `src/middlewares/published-only.ts` forces `status=published` on every unauthenticated `/api/*` request; drafts are never readable anonymously. No API tokens needed by anyone; no webhooks; no Medusa plugin or module.
- hreflang: the storefront maps locales of one entry through its `localizations` (same `documentId`).

## Medusa custom code (apps/backend/src)

- No Strapi code of any kind.
- `data/governorates.ts`, `scripts/seed.ts` (see Seed data).
- Translation module feature flag on; seed Arabic translations.
- Telemetry disabled (`MEDUSA_DISABLE_TELEMETRY=true`).
- Later: `modules/specs` (filterable attributes), `modules/store-settings` (homepage hero) if needed.

## Storefront (apps/storefront)

- Routes: `/ar/...` (default) and `/en/...` with next-intl; `<html lang dir>` set per locale; Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`) so one layout flips.
- Sends `x-medusa-locale: ar-SA` (for `ar`) or `en` to Medusa.
- Fetches Strapi content server-side, cached (fetch cache with revalidation); Medusa and Strapi URLs are internal compose hostnames; the browser never calls Strapi. Strapi being down never breaks a page: SEO content is optional everywhere.
- SEO routes: `/[locale]/guides` (list of published articles), `/[locale]/guides/[slug]`, `/[locale]/l/[slug]` (landing pages), `/[locale]/pages/[slug]` (markdown legal pages from the repo). Product pages render `product-seo` by handle below the Medusa description; category pages render `category-seo` intro above the grid and FAQ below.
- `sitemap.xml` (products, categories, guides, landing pages unless `noindex`, legal pages) and `robots.txt`; hreflang alternates on every page; JSON-LD: `Product` on product pages, `Article` on guides, `FAQPage` where FAQ exists, `BreadcrumbList`.
- Product descriptions from Medusa are rendered as markdown (sanitized).
- Price formatting from the cart/region `currency_code` with `Intl.NumberFormat` — no hard-coded currency symbols.
- Address form per the table above; governorate dropdown from a shared constants file.
- Performance budget (enforced later in CI): first view ≤ 500 KB transferred, PLP/PDP JS ≤ 170 KB compressed, hero ≤ 60 KB AVIF/WebP, one self-hosted Arabic font subset.

## Secrets and config

- `infra/.env.example` lists every variable with a comment; real values only in `infra/.env` (gitignored) on the server.
- First deploy bootstrap (`infra/scripts/bootstrap.sh`, idempotent): creates the Strapi admin user, runs Medusa migrations and seed, creates the Medusa admin user, reads the storefront publishable key into `.env` for the storefront and Caddy. No token passes between Strapi and Medusa.
- Medusa `DATABASE_URL` carries `?sslmode=disable` (internal network only).

## CI (`.github/workflows`)

- `build.yml`: on push to `main` and on tags, build `apps/backend`, `apps/cms`, `apps/storefront` images with Buildx + GHA cache, push to `ghcr.io/<owner>/<repo>-<app>:<sha>` and `:latest`.
- `deploy.yml`: manual trigger (and after build on `main` for staging): SSH to the server, `docker compose pull && docker compose up -d`, then `docker compose ps`.

## Out of scope for phase 1

ShamCash provider, SMS gateway, admin ops screens (confirmation queue, courier settlement, risk list), specs module, search tuning, offline catalogue. Each gets its own follow-up.
