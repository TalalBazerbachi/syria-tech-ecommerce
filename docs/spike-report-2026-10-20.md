# Spike: Medusa v2 + Strapi v5 on one Docker host (Syria store)

**Date:** 2026-10-20

**Result:** Everything runs end to end in Docker Compose:

- Medusa → Strapi product sync
- Strapi → Medusa sync for the default locale
- Strapi en and ar content returned by `/store/products`
- A cash-on-delivery order completed in SYP
- The Medusa Translation module serving Arabic

The official guide does **not** work as written on the current versions. It needed 4 fixes, listed under "What broke". Raw outputs are in `logs/`.

## Versions

Versions below are what was installed on 2026-10-20 (the latest on npm that day).

| Component | Version |
|---|---|
| `@medusajs/medusa`, `framework`, `cli`, `caching-redis` and the other `@medusajs/*` packages | **2.21.2** (published 2026-10-19). The scaffold is now a turbo monorepo with the backend in `apps/backend`. |
| `@strapi/strapi` | **5.58.0** (published 2026-10-20), with `pg` 8.20.0 |
| `@strapi/client` | 1.6.2 |
| Runtime images | Node v22.23.3 on `node:22-alpine`; Postgres **17.11** (`postgres:17-alpine`; switching from 16 was just an image tag change); Redis 7.4.8 |
| The guide's own example repo | Written for Medusa 2.14.0 and Strapi 5.30.1, so it lags the current versions |

## Architecture as built (`docker-compose.yml`, project `syria-spike`)

| Service | Image | Host port | Notes |
|---|---|---|---|
| `postgres` | postgres:17-alpine | 127.0.0.1:15432 | One instance. An init script creates separate `medusa` and `strapi` databases and roles. Volume: `pgdata`. |
| `redis` | redis:7-alpine | 127.0.0.1:16379 | AOF on, `noeviction`. Volume: `redisdata`. |
| `strapi` | `syria-spike/strapi` (multi-stage) | 11337 | `NODE_ENV=production`. Healthcheck `/_health`. Volume: `strapi_uploads`. |
| `medusa-server` | `syria-spike/medusa` (multi-stage) | 19000 | `MEDUSA_WORKER_MODE=server`. Serves the admin at `/app`. Runs `db:migrate` (its "predeploy" step) in the entrypoint. |
| `medusa-worker` | same image | – | `MEDUSA_WORKER_MODE=worker`, admin disabled. Starts only after the server is healthy. |

- **Healthchecks:** every service has one, and `depends_on` uses `service_healthy`.
- **Medusa Redis modules:** caching (with the `caching-redis` provider), event bus, workflow engine and locking (`locking-redis`). The Translation module is enabled through `MEDUSA_FF_TRANSLATION`.
- **Bootstrap:** `scripts/bootstrap.sh` runs in two phases, because each app needs a secret that only the other can issue:
  1. Strapi admin → full-access API token → written to `.env` for Medusa.
  2. Start Medusa → Medusa secret API key → passed to Strapi as the webhook `Authorization` header → webhook row created.

## How the integration works

**Medusa → Strapi (worker process)**

- Subscribers listen for `product.*`, `product-variant.*` and `product-option.*` events.
- They run workflows that call Strapi's REST API through `@strapi/client`.
- These steps have compensation (rollback) handlers and use Redis locks.
- The Strapi IDs are written back into `product.metadata` as `strapi_id` and `strapi_document_id`.
- **Entities synced:** product, variant, option and option value. Images are uploaded too; I did not test this because the test product had no images.

**Strapi → Medusa**

- A Strapi `entry.update` webhook calls `POST /webhooks/strapi` on Medusa.
- Middleware checks the Bearer token against Medusa's API Key module.
- `handleStrapiWebhookWorkflow` then updates the product's title, subtitle, description and handle, the variant title and SKU, and option titles and values.
- It clears the product cache and skips duplicate payloads (60-second hash in the Redis cache) to avoid sync loops.

**Read path**

- A read-only module link (`strapi_product`) calls the Strapi module's `list()` for each product.
- It is exposed on the Store API with `allowFields("strapi_product")`.

**i18n**

The guide uses a plain `locale` string field. I switched the Strapi `product` type to **native Strapi i18n** instead:

- `title`, `subtitle` and `description` are localized; `medusaId`, `handle` and media are not.
- A bootstrap step creates the `ar` locale.
- `list()` adds `translations.ar` to the link output.
- The webhook route **ignores non-default locales**, so Arabic edits never overwrite Medusa's English fields.
- Variants and options are not localized yet.

## Verification (trimmed real output)

**1. Product created via the Admin API**
```
POST /admin/products  -> {"id":"prod_01M5CGCRQFP86WPHYNPADEC1KN","title":"Samsung Galaxy A55","options":[{"title":"Color","is_exclusive":true}],
  "variants":[{"sku":"A55-BLU","prices":[{"currency_code":"syp","amount":5200000},{"currency_code":"usd","amount":399}]},...]}
```

**2. It appears in Strapi within about 1 second**
```
{"id":7,"documentId":"yyoqt0zz8i3s1wl9ryz3q2ju","medusaId":"prod_01M5CGCRQFP86WPHYNPADEC1KN","title":"Samsung Galaxy A55","locale":"en",
 "variants":["A55-BLU","A55-BLK"],"options":[{"title":"Color","values":["Black","Blue"]}]}
```

**3. English edit in Strapi flows back to Medusa; Arabic edit is ignored**
```
medusa: POST /webhooks/strapi 200 ; admin product subtitle -> "128GB · Dual SIM · 5G", description -> markdown from Strapi
medusa: Strapi webhook for locale "ar" ignored (default locale is "en")   ; Medusa title stays English
```

**4. Store API returns Strapi en and ar content**
```
GET /store/products?handle=galaxy-a55&region_id=<Syria>&fields=...,*strapi_product
{"title":"Samsung Galaxy A55","price_syp":{"calculated_amount":5200000,"currency_code":"syp"},
 "strapi_product":{"locale":"en","subtitle":"128GB · Dual SIM · 5G",
   "ar":{"title":"سامسونج جالاكسي A55","subtitle":"128 جيجابايت · شريحتان · شبكة 5G","description":"## نظرة عامة\nيأتي **جالاكسي A55**..."}}}
```

**5. Medusa Translation module (your target design for short Arabic text) works with the SYP region**
```
POST /admin/translations/batch {reference:"product",locale_code:"ar-SA",translations:{title,subtitle}} -> created
GET /store/products (SYP region) + x-medusa-locale: ar-SA -> {"title":"سامسونج جالاكسي A55","subtitle":"128 جيجابايت، شريحتان","price":{"calculated_amount":5200000,"currency_code":"syp"}}
without header -> English;  x-medusa-locale: ar (plain) -> silently falls back to English
```

Locale caveat: Medusa's locale list has **no `ar` or `ar-SY`**. The Arabic options are only `ar-EG`, `ar-SA` and `ar-AE`, so a regional Arabic code has to stand in for Syria.

## Syria commerce checks

| Check | Result |
|---|---|
| SYP currency | Accepted: `{"code":"syp","symbol_native":"ل.س.‏","decimal_digits":0}`. Amounts are whole SYP (5,200,000). |
| Store currencies | `usd` (default), `syp` and `eur` set without issues. |
| Region "Syria" in SYP, country `sy` | Created. |
| USD alongside SYP | **Not in the same region.** A region has one currency, and a second region claiming `sy` fails with `"Countries with codes: \"sy\" are already assigned to a region"`. A **"Syria (USD)" region with no countries** works: a USD cart with a Syrian address was created (total 399). I did not complete a USD checkout. Variants hold prices in both SYP and USD. |
| `pp_system_default` (cash on delivery) | Enabled on both Syria regions; `/store/payment-providers` returns it. |
| Manual fulfillment | "Damascus Warehouse" with the `manual_manual` provider. Service zone **"Damascus" uses a province geo zone `sy-di`**, plus a country-level zone "Rest of Syria". Shipping option at 25,000 SYP / 2 USD. |
| Province routing | A Damascus (`sy-di`) cart sees the courier option; an Aleppo (`sy-hl`) cart sees none. |
| Full cash-on-delivery checkout | Order `display_id 1`: 5,225,000 SYP, `payment_status: authorized`, `not_fulfilled`. |

## Measurements

Measured on Docker Desktop (arm64 VM with 8 GB and 5 CPUs). Load was run against `/store/products?limit=20` (5 products).

| Container | Idle (5 min after start) | Load: product listing, 10 connections | Load: listing with `*strapi_product` | After load |
|---|---|---|---|---|
| medusa-server | 239 MiB / 0% | **323 MiB / 101%** | 322 MiB / 33% | 301 MiB |
| medusa-worker | 146 MiB | 141 MiB / 4% | 140 MiB / 19% | 131 MiB |
| strapi | 125 MiB / 3% | 126 MiB / 0% | **133 MiB / 136%** | 153 MiB |
| postgres | 86 MiB | 92 MiB / 12% | 111 MiB / 39% | 110 MiB |
| redis | 11 MiB | 10 MiB / 9% | 9 MiB / 4% | 10 MiB |
| **Total** | **~0.6 GiB** | ~0.7 GiB | ~0.7 GiB | ~0.7 GiB |

**Throughput**

- 200 sequential curl requests: 200 × HTTP 200 in 9.0 s, average 45 ms.
- autocannon, 10 connections for 15 s: average **89 req/s**; latency p50 66 ms, p97.5 482 ms, p99 789 ms. The server is pinned at about one CPU core, since a single Node process can only use one core.
- **Same listing with `*strapi_product`: 0 of 20 requests finished within the 10 s timeout.**
  - A single request takes 1.68 s for 5 products, or 0.26 s for 1 product.
  - Cause: the link's `list()` makes sequential REST calls to Strapi for each product, with deep populate, plus the extra Arabic call I added.

**Image sizes and build times**

| Item | Medusa | Strapi |
|---|---|---|
| Image size | 1.1 GB | 802 MB |
| `node_modules` inside the image | ~775 MB | ~772 MB |
| Cold build | **495 s**, of which `chown -R` took 222 s and `npm install --omit=dev` took 174 s | **175 s** |
| Build on the host, outside Docker | `medusa build` 23.6 s | `strapi build` 17.4 s |

Base images: postgres:17-alpine is 291 MB and redis:7-alpine is 42 MB. On first boot Strapi was healthy in about 20 s, and the full Medusa phase (migrations, seed, server and worker) took about 55 s.

**Not done:** I skipped the optional Next.js storefront container because of the time box. Its memory was not measured.

## What broke, and the fixes

1. **The guide's code fails on Medusa 2.21.** Product options are now many-to-many with products (`products` and `is_exclusive`), so `product`, `product_id` and `product.metadata` no longer exist on `product_option`.
   - I patched 3 workflows; `tsc` is now clean.
   - **Still open: shared (non-exclusive) options.** The starter's seed creates them, and all 4 demo products failed to sync with `HTTP 400 "This attribute must be unique"` on `product-options`. The rollback then deleted their Strapi entries.
   - Fixing this needs an idempotent upsert and a many-to-many Strapi schema. Products with their own inline options (the normal admin flow) sync fine.
2. **Strapi 5.58 scaffolds with `strict: true` in TypeScript** (the example used `false`), so the guide's lifecycle hooks failed with TS7006. Fixed by typing `event: any`.
3. **Medusa in production forces SSL for any database host that isn't localhost.**
   - The documented `?ssl_mode=disable` does **not** work in 2.21.2: it is stripped from the URL before the SSL check runs (`medusa-app-loader` → `getDefaultDriverOptions`). Migrations then hang and time out after 10 s.
   - Fix: `?sslmode=disable`.
4. **Strapi in production refuses webhook URLs that resolve to private IPs** through its admin API: `"Url is not supported because it isn't reachable over the public internet"`. It also rejects the `isEnabled` field. Delivery itself is not restricted.
   - Fix: insert the row into `strapi_webhooks` directly and restart Strapi.

**Local environment only, not a stack issue:** `docker pull` and BuildKit hung because the macOS keychain credential helper blocks inside the agent sandbox. I worked around it with an isolated anonymous `DOCKER_CONFIG`.

## Recommendations and risks for production

**Sizing**

- **Plan on 4 vCPU / 8 GB.** The measured stack needs about 0.6–0.75 GiB, so 4 GB is the bare minimum, but the storefront wasn't measured and on-box builds need more.
- **Don't build on the VPS:** cold builds take 3–8 minutes and need several GB of disk. Build the images in CI and pull them onto the server.

**Performance**

- **Keep `strapi_product` off listing and search pages.** It makes one REST call per product with no caching. Either:
  - batch it into one `$in` query and cache it with the Medusa caching module, or
  - have the storefront read Strapi directly with ISR or a CDN.
- **Medusa server is single-core** at about 90 req/s for listings. Put a cache or CDN in front, and add server replicas for scale. The worker can stay at one instance.

**Sync design**

- **Pick one owner per field.** Under your target design (Arabic titles and short descriptions in Medusa's Translation module, Strapi for long-form only), narrow the Strapi → Medusa webhook so it stops writing title and subtitle. Otherwise both systems edit the same fields. I verified the Translation module works with SYP and `ar-SA`.
- **Sync failures are not retried.** The logs say: "Retrying is not configured. Use 'attempts' option". Add `attempts` and a reconciliation job; otherwise drift between the two systems goes unnoticed.
- **Shared options need work** before the catalog can use them (see "What broke" item 1).

**Security**

- **Strapi API token:** use a custom-scoped token, not full-access.
- **Network exposure:** remove the published DB and Redis ports, and put Caddy or Traefik in front for TLS. Restrict Strapi `/admin` and Medusa `/app`.
- **Telemetry:** disable Medusa's (I saw its telemetry banner in the logs).
- **Webhooks:** either target a public HTTPS URL or seed the internal webhook as code.

**Operations**

- Automate the two-phase secret bootstrap, which is a chicken-and-egg problem at first deploy.
- Back up with `pg_dump` (both databases) plus the `strapi_uploads` volume.
- Set `sslmode` explicitly in `DATABASE_URL`.
- Fix the Medusa Dockerfile: use `COPY --chown` and install as `node`. This removes the 222 s `chown`.

**Locales**

- Medusa's built-in locale list has no plain Arabic and no Syrian code (only `ar-EG`, `ar-SA`, `ar-AE`). Pick one and map it in the storefront; a plain `ar` header silently falls back to English.
- In Strapi, the non-localized UID `handle` came back `null` on the `ar` entry.

**Currency**

- Medusa allows one currency per region and one region per country. For USD next to SYP, either:
  - use a USD region with no countries, selected in the storefront, or
  - keep only the SYP region and handle USD at display level.
- Plan for SYP volatility: re-pricing means updating prices in bulk.

## Files (in this directory)

- `docker-compose.yml`, `.env.example` (`.env` holds the generated test secrets)
- `docker/postgres-init/01-create-dbs.sh`
- `medusa/Dockerfile`, `medusa/docker-entrypoint.sh`, `medusa/apps/backend/{medusa-config.ts, src/modules/strapi, src/links, src/subscribers, src/workflows, src/api}`
- `strapi/Dockerfile`, `strapi/src/api/*`, `strapi/src/index.ts`, `strapi/config/server.ts`
- `scripts/bootstrap.sh`, `scripts/env.sh`, `scripts/lib.sh`, `logs/*`

The stack was stopped with `docker compose -p syria-spike down`; volumes and files are kept.

## USD first, SYP later

**Verdict:** this works on the same stack, with no data migration and without touching the USD region. Adding SYP only creates new rows: a region, a store currency, and price rows. Logs are `logs/usd-0*.log`, and the checkout script is `scripts/cod-checkout.sh`.

**1. Launch setup: USD only**

- A country can belong to only one region. Giving `sy` to a second region fails with `"Countries with codes: \"sy\" are already assigned to a region"`. Removing it from the old region (`countries: []`) first works.
- Deleting the old SYP region was **allowed even though it had an order**. Order #1 keeps its `region_id`, `syp` currency and 5,225,000 total.
- Removing `syp` from the store currencies was also allowed, even though SYP prices still existed.
- I created region `Syria`: `usd`, country `sy`, `pp_system_default`. I then added a Damascus (`sy-di`) shipping option priced in USD only, and a new product priced in USD only.

```
cart: {"currency":"usd","item_total":229}   shipping options: [{"name":"Damascus courier (COD)","amount":2,"currency":"usd"}]
payment session: {"amount":231,"currency":"usd","sessions":[{"provider_id":"pp_system_default","status":"pending"}]}
complete: {"type":"order","order":{"display_id":2,"currency_code":"usd","total":231}}
```

**2. Adding SYP later (the USD region was not modified)**

- Added `syp` to the store currencies; `usd` stays the default.
- Created region `Syria (SYP)`: `syp`, **no countries**, `pp_system_default`.
- Added SYP prices next to the existing USD prices. Passing the existing USD price `id` keeps that price untouched:

```
variant prices: [{"id":"price_…ZPM","currency_code":"usd","amount":229},{"id":"price_…Y92","currency_code":"syp","amount":3000000}]
shipping option: [{"currency_code":"usd","amount":2},{"currency_code":"syp","amount":25000}]
```

A cart in the SYP region with a Damascus address (`sy` / `sy-di`):

- The shipping option appears, because shipping options follow the address's service zone, not the region's country list.
- The payment session works, because the provider is enabled on the SYP region.
- The order completes:

```
cart: {"currency":"syp","item_total":3000000}  shipping options: [{"name":"Damascus courier (COD)","amount":25000,"currency":"syp"}]
payment session: {"amount":3025000,"currency":"syp","sessions":[{"provider_id":"pp_system_default","status":"pending"}]}
complete: {"type":"order","order":{"display_id":3,"currency_code":"syp","total":3025000}}
USD order #2 afterwards: {"currency_code":"usd","total":231,"payment_status":"authorized","item_unit_price":229,"shipping":2}
USD region checkout again: {"display_id":4,"currency_code":"usd","total":231}
```

Moving an open USD cart to the SYP region with `POST /store/carts/:id {region_id}` re-prices it: `{"currency":"syp","unit_price":3000000}`. That is what a storefront currency switcher would use.

**3. Changing a region's currency through the Admin API**

`POST /admin/regions/:id {"currency_code":"syp"}` **succeeds with no guard**, and changing it back to `usd` also works. Existing orders kept their currency and totals. This is risky on a live region: a single admin edit re-currencies the whole region and every open cart in it. Create a new region instead of editing the currency.

**4. Gotchas**

- **Tax:** there is no tax region for `sy`; only the 7 seeded EU ones exist. Checkouts work with `tax_total: 0`. If tax is ever charged, create a `sy` tax region; existing orders are unaffected.
- **Tax-inclusive pricing:**
  - Medusa automatically creates a price preference for each currency and each region; all of them were `is_tax_inclusive: false`.
  - Adding SYP creates both `currency_code=syp` and `region_id=<SYP region>` entries.
  - Deleted regions leave their preference rows behind.
  - Set the tax-inclusive flag per currency *before* launch if prices are entered gross.
- **Store default currency:** `usd` can stay the default; adding `syp` doesn't affect it.
- **Promotions:**
  - A fixed-amount promo with `currency_code: usd` applies to USD carts (`discount_total: 5`). On a SYP cart it **silently gives 0** (`discount_total: 0`, no error).
  - A fixed promo with no currency can also be created (`currency_code: null`). I didn't test how it behaves.
  - Percentage promos aren't tied to a currency.
  - Plan SYP versions of fixed promos when SYP launches.
- **Price lists** hold prices per currency, so sale prices need SYP rows added too. That is new data, not a migration.
- **SYP amounts** are whole pounds (`decimal_digits: 0`). With the exchange rate moving, plan bulk SYP repricing through the variant price batch APIs, or keep SYP as a price list.
- **What would force a migration:** nothing I saw. The only one-way decision is which region owns country `sy`; the SYP region works without owning it.

The stack was stopped again with `docker compose -p syria-spike down`; volumes are kept.
