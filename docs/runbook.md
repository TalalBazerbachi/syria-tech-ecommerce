# Runbook

Operations for the Syria tech store stack (Medusa 2.21 + Strapi 5.58 + storefront on one Docker
host). Spec: `docs/architecture.md`. Everything below runs from `infra/` on the server unless noted.

## 1. First deploy

Server: Hetzner Cloud, Ubuntu 24.04, 4 vCPU / 8 GB, Docker Engine + Compose plugin, `jq`, `node`
(22, for `scripts/*.sh` JSON parsing), `restic`. DNS: `STORE_DOMAIN`, `CMS_DOMAIN`, `MEDIA_DOMAIN`
pointing at the server (Cloudflare proxied, SSL mode **Full (strict)**).

```sh
sudo mkdir -p /opt/syria-tech-ecommerce && sudo chown "$USER" /opt/syria-tech-ecommerce
git clone <repo> /opt/syria-tech-ecommerce && cd /opt/syria-tech-ecommerce/infra
cp .env.example .env && chmod 600 .env
```

Edit `.env` (every variable is commented in `.env.example`). Production values that differ from the
dev defaults:

- `STORE_DOMAIN`, `CMS_DOMAIN`, `MEDIA_DOMAIN`, `ACME_EMAIL`
- `CADDY_HTTP_BIND=80`, `CADDY_HTTPS_BIND=443` (the dev defaults bind loopback high ports)
- `GHCR_OWNER` = the GitHub owner (lowercase); `IMAGE_TAG=latest` (or a sha)
- `MEDUSA_BACKEND_URL=https://$STORE_DOMAIN`, `STOREFRONT_PUBLIC_URL=https://$STORE_DOMAIN`,
  `STRAPI_PUBLIC_URL=https://$CMS_DOMAIN`, `MINIO_PUBLIC_URL=https://$MEDIA_DOMAIN`
- `MEDUSA_STORE_CORS=https://$STORE_DOMAIN`, `MEDUSA_ADMIN_CORS=https://$STORE_DOMAIN`,
  `MEDUSA_AUTH_CORS=https://$STORE_DOMAIN`
- every secret: `openssl rand -base64 32`
- `RESTIC_REPOSITORY`, `RESTIC_PASSWORD` for backups

Pull access to GHCR (if the packages are private): `echo $TOKEN | docker login ghcr.io -u <user> --password-stdin`
with a read-only PAT (`read:packages`).

Then run the bootstrap (section 2). Point the storefront's GitHub secrets at this server (section 6).

## 2. Bootstrap

`scripts/bootstrap.sh` is idempotent; rerun it whenever the publishable key is missing from `.env`.

1. Starts postgres, redis, minio (+ `minio-init` creates the `medusa-media` and `strapi-media`
   buckets, public-read), strapi. Waits for healthchecks.
2. Creates the Strapi admin (`STRAPI_ADMIN_EMAIL/PASSWORD`). That is all Strapi needs: on boot it
   creates the `en`/`ar` locales itself and grants the Public role read access to the four SEO
   types (`apps/cms/src/index.ts`). No token passes between Strapi and Medusa; neither knows
   the other exists.
3. Starts medusa-server (runs `db:migrate` on boot) and medusa-worker. Runs the seed
   (`src/scripts/seed.js`, idempotent). Creates the Medusa admin user.
4. Reads the publishable API key `Storefront` created by the seed and writes it to `.env` as
   `MEDUSA_PUBLISHABLE_KEY`. Two consumers read it from there: the storefront container (its
   Next.js server sends it on its own Store API calls) and **Caddy**, which adds it to any
   browser request to `/store/*` that arrives without one. That is why the storefront image
   is built in CI with no key baked in. If you ever rotate the key, rerun bootstrap or
   `docker compose up -d caddy storefront` so both pick it up.
5. Starts storefront + caddy (`SKIP_FRONT=1` skips this).

Dev: `DEV=1 ./scripts/bootstrap.sh` adds `docker-compose.dev.yml` (local builds, localhost ports).

Afterwards log in to both admins and change the bootstrap passwords. Keep Medusa admin accounts
few: free Medusa has no roles.

## 3. Backups and restore

### Backup

`scripts/backup.sh` dumps both databases (`pg_dump -Fc` + `pg_dumpall --globals-only`), mirrors
both MinIO buckets with `mc`, copies `.env`, and sends the staging directory to restic
(`RESTIC_REPOSITORY`, e.g. `sftp:u123456@u123456.your-storagebox.de:/backups/syria-tech`).
Retention: 7 daily, 4 weekly, 6 monthly.

```
# /etc/cron.d/syria-backup
30 2 * * * deploy cd /opt/syria-tech-ecommerce/infra && ./scripts/backup.sh >> /var/log/syria-backup.log 2>&1
```

Check monthly: `restic snapshots` and a restore test on the staging server.

### Restore

Target: a server with the repo checked out and `.env` in place (restore `env.<stamp>` from the
snapshot if needed).

```sh
cd /opt/syria-tech-ecommerce/infra
export RESTIC_REPOSITORY=... RESTIC_PASSWORD=...
restic snapshots --tag syria-tech-ecommerce                 # pick an ID
restic restore <ID> --target /var/backups/restore           # -> /var/backups/restore/var/backups/.../stage

DC="docker compose -p syria-tech-ecommerce"
$DC up -d postgres minio minio-init && sleep 10

# Databases: drop and recreate, then restore the custom-format dumps
S=/var/backups/restore/var/backups/syria-tech-ecommerce/stage
for db in medusa strapi; do
  $DC exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS $db;" -c "CREATE DATABASE $db OWNER $db;"
  $DC exec -T postgres pg_restore -U postgres -d $db --no-owner --role=$db < $S/db/$db.dump
done

# Files: push the mirrored buckets back
$DC run --rm -v $S/minio:/backup --entrypoint /bin/sh minio-init -c \
  'mc alias set local $MINIO_ENDPOINT $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD && for b in $BUCKETS; do mc mirror --overwrite /backup/$b local/$b; done'

$DC up -d                                                   # medusa runs db:migrate on boot
$DC ps
```

Redis holds only caches, locks and in-flight workflow state; it is not backed up. Medusa and Strapi
hold nothing about each other, so the two databases can be restored independently and from
different snapshots if needed.

## 4. Upgrading Medusa safely

Medusa is pinned exactly (`2.21.2` on every `@medusajs/*` package). Upgrade deliberately:

1. Read the release notes for every version between current and target; search for "breaking",
   "migration" and anything touching `product_option`, `translation`, `file`, `caching`.
2. On a branch, in `apps/backend`: `npx npm-check-updates -u "/@medusajs/" --target <version>` then
   `npm install`, `npx tsc --noEmit`, `npm run build`.
3. Run the dev stack with a copy of production data
   (`pg_dump` -> local `pgdata`), let `db:migrate` run, then the integration checks:
   - `/store/regions` shows Syria/USD, `/store/products` with `x-medusa-locale: ar-SA` returns Arabic
   - `POST /store/search` (the search index config in `src/api/middlewares.ts`) still returns products
   - upload an image in the admin -> URL under `MINIO_PUBLIC_URL` loads
   - `scripts/cod-checkout.sh` completes an order for `sy-di`; `sy-hl` gets no shipping option
4. Strapi is untouched by a Medusa upgrade (nothing connects them); no cross-check needed.
5. Merge, let CI build, deploy to **staging** first (`deploy.yml`, environment `staging`), repeat the
   checks there, then deploy to production with the same image sha. Take a backup right before.
6. Rollback = redeploy the previous sha (`IMAGE_TAG`). Database migrations are forward-only: if a
   migration ran, restore the pre-upgrade dump instead.

Strapi upgrades: same flow; run `npx @strapi/upgrade minor --dry` first, and re-check the S3 upload
provider version matches `@strapi/strapi`.

## 5. Adding SYP later (second region, no migration)

Verified in the spike (docs/spike-report-2026-10-20.md, "USD first, SYP later"). The USD region is
not touched; everything is new rows.

1. Store currencies: add `syp` (keep `usd` default). Admin -> Settings -> Store, or
   `POST /admin/stores/:id { supported_currencies: [{currency_code:"usd",is_default:true},{currency_code:"syp"}] }`.
2. Create region **"Syria (SYP)"**: currency `syp`, **no countries** (country `sy` stays with the
   USD region; a country can belong to one region only), payment provider `pp_system_default`.
3. Prices: add SYP rows next to the USD ones. Variant price batch endpoints accept existing USD
   price `id`s untouched plus new `{currency_code:"syp", amount}` rows. SYP amounts are whole
   pounds (`decimal_digits: 0`). Plan a bulk-repricing script: the rate moves.
4. Shipping options: add a `{currency_code:"syp"}` price to each courier option.
5. Storefront: a currency switcher moves the cart with `POST /store/carts/:id { region_id }`
   (re-prices the cart). Shipping options follow the address's service zone, so Damascus/Rif
   Dimashq work in both regions.
6. Promotions: fixed-amount promos are per currency (a USD promo silently gives 0 on SYP carts);
   create SYP versions. Percentage promos are currency-free.
7. Tax: no `sy` tax region exists; checkouts carry `tax_total: 0`. Create one only if tax is charged.
8. Never change an existing region's currency (`POST /admin/regions/:id {currency_code}` succeeds
   with no guard and re-currencies every open cart). Create a region instead.

## 6. CI secrets

Set in GitHub -> Settings -> Environments -> `staging` and `production` (each its own values):

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | server IP/hostname |
| `DEPLOY_USER` | ssh user in the `docker` group |
| `DEPLOY_SSH_KEY` | ed25519 private key; its public key in that user's `authorized_keys` |
| `DEPLOY_PATH` | `/opt/syria-tech-ecommerce` |
| `DEPLOY_PORT` | optional, default 22 |

`build.yml` needs nothing but the default `GITHUB_TOKEN` (`packages: write`). Private GHCR packages
also need a `docker login ghcr.io` on the server (read-only PAT), done once by hand.

Its `check` job (backend typecheck + unit tests, storefront typecheck) must pass before any image
is built, so a red check never reaches staging.

Repository **variable** (Settings -> Secrets and variables -> Actions -> Variables), not a secret:

| Variable | Purpose |
| --- | --- |
| `MEDIA_HOSTNAME` | `MEDIA_DOMAIN`, or a wildcard covering staging and production (`**.example.com`). Baked into the storefront image; turns on `next/image` resizing to WebP for product and article images. Empty = images are served at their uploaded size. |

With it set, resized images come from `https://<store>/_next/image?...` (cached 31 days). A
Cloudflare Cache Rule for the path `/_next/image` ("Eligible for cache", respect origin TTL) lets
Cloudflare serve repeats instead of the VPS.

## 7. Day-2 operations

- **Logs:** `docker compose -p syria-tech-ecommerce logs -f --tail 200 medusa-server` (or
  `medusa-worker` for scheduled jobs and subscribers, `strapi` for the CMS).
- **Re-seed:** `docker compose exec medusa-server ./node_modules/.bin/medusa exec ./src/scripts/seed.js`
  is safe to rerun; it only adds what is missing (new launch zones in
  `src/data/governorates.ts` -> `LAUNCH_ZONE_CODES`).
- **Add a governorate zone:** append its code to `LAUNCH_ZONE_CODES`, redeploy, rerun the seed.
- **Memory:** `docker stats --no-stream`; the spike measured ~0.7 GiB for the backend stack
  without the storefront.
- **Arabic shipping option names:** the seed stores `ar-SA` translations for shipping options
  (`/admin/translations?reference=shipping_option`). Medusa translates the checkout options from
  the cart's `locale` (set by the storefront, kept in step by the language switcher) and saves the
  translated name on the order. A new shipping option needs its own `ar-SA` translation (admin, or
  rerun the seed for launch zones), otherwise Arabic checkouts show its English name.
- **New-order alerts (Telegram):** set `ORDER_ALERT_TELEGRAM_BOT_TOKEN` and
  `ORDER_ALERT_TELEGRAM_CHAT_ID` in `.env` (how to get both: comments in `.env.example`), then
  `docker compose up -d medusa-worker`. Each order posts number, total, payment method, name,
  phone, governorate, address, landmark, notes, delivery option, items and an admin link to that
  chat (`src/subscribers/order-alert-placed.ts`). Check with `docker compose logs medusa-worker |
  grep order-alert`: `sent for <order>` or `failed for <order>: <Telegram's reason>`. A failed
  alert never fails the order. Customers get no email or SMS; the thank-you page tells them the
  store will call to confirm.
- **Store phone / WhatsApp:** `STORE_WHATSAPP` and `STORE_PHONE` in `.env` show in the footer and
  on checkout (the legal pages point there). `docker compose up -d storefront` after a change.
- **Checkout email is optional:** the phone is the required contact. Orders without an email have
  no customer record; staff find them by order number or phone.
- **Warranty:** the warranty page says each product's warranty is in its description, so put the
  length and type (distributor or store) in every product description.
- **Disk:** `docker system df`; `docker image prune -f` after deploys (deploy.yml does this).

## 8. Strapi: the SEO CMS

Strapi (`CMS_DOMAIN`, admin at `/admin`) holds SEO content only and is not connected to Medusa in
any way: no plugin, module, subscriber, webhook or token in either direction. Medusa does not know
Strapi exists; the storefront reads both and joins them by **handle** at render time.

What editors create there, each in `en` and `ar` (same entry, two localizations), as a draft first
and then **Publish**:

| Type | REST | What it is | Handle field (typed by hand) |
| --- | --- | --- | --- |
| Article | `/api/articles` | guides, comparisons, how-tos, news (`kind`), with `body`, `cover`, `faq` | `relatedProductHandles` (JSON array), `relatedCategoryHandle` |
| Landing page | `/api/landing-pages` | `hero` + `sections` dynamic zone (`richtext`, `product-grid`, `faq-list`); `noindex` keeps it out of the sitemap | `product-grid.collectionHandle`, `product-grid.productHandles` |
| Category SEO | `/api/category-seos` | `intro` above the category grid, `seoTitle`/`seoDescription`, `faq` below | `categoryHandle` (unique) |
| Product SEO | `/api/product-seos` | `longDescription` under the Medusa description, `seoTitle`/`seoDescription`, `faq` | `productHandle` (unique) |

Handles are the Medusa product/category handles exactly as the admin shows them (for example
`lenovo-ideapad-slim-3-15`, `laptops`); a typo simply means the storefront finds no SEO entry and
renders the page without it. Renaming a handle in Medusa means editing the string in Strapi too.

Access: the Public role has `find` + `findOne` on these four types and nothing else, granted by
Strapi on boot (`apps/cms/src/index.ts`). Anonymous requests only ever get **published** entries:
Strapi defaults to published, and `apps/cms/src/middlewares/published-only.ts` forces
`status=published` on every unauthenticated `/api/*` call (Strapi 5 would otherwise honour
`?status=draft` for the Public role). Drafts are therefore never visible on the store. That is all
the storefront needs; `STRAPI_READ_TOKEN` in `.env` is optional and can stay empty. Do not create
API tokens for Medusa; there is nothing to give one to.

Day-2: rebuilding the `strapi` image alone (`docker compose up -d --build strapi` in dev, or a deploy)
is safe at any time; Medusa and the storefront keep running, and the storefront renders pages
without SEO content while Strapi is down.

## 9. Analytics (PostHog)

Spec: `docs/analytics.md`. PostHog (Cloud EU) is the one event pipeline: the storefront sends the
behaviour events from the browser, Medusa sends the money events from the server, PostHog forwards
conversions to the ad platforms. Nothing here is required for the store to work: every analytics
path is fail-safe (errors are logged, never thrown) and the stack boots without a key.

### Environment

| Variable (`infra/.env`) | Meaning |
| --- | --- |
| `POSTHOG_EVENTS_KEY` | PostHog project API key (`phc_...`). Public by design: the browser sends it too. Shared by Medusa (server + worker) and the storefront. |
| `POSTHOG_HOST` | Ingestion host for server events. Default `https://eu.i.posthog.com`. |
| `ANALYTICS_PROVIDER` | `posthog` or `local`. Empty = `posthog` when the key is set, `local` otherwise. `posthog` without a key falls back to `local` with a warning in the Medusa log instead of refusing to boot. |
| `LOG_LEVEL` | Medusa log level; `debug` makes the `local` provider's events visible. Keep Medusa's default `http` in production. |

The variables are passed to `medusa-server` and `medusa-worker` through `x-medusa-env` in
`docker-compose.yml`. `apps/backend/.env.example` documents the same for a host-run `npm run dev`.
Changing them means `docker compose up -d medusa-server medusa-worker` (recreate, no rebuild).

### What Medusa sends, and from where

Registered in `apps/backend/medusa-config.ts` as the Analytics Module (`@medusajs/medusa/analytics`)
with exactly one provider. Subscribers live in `apps/backend/src/subscribers/analytics-*.ts`, mapping
helpers in `apps/backend/src/lib/analytics/` (`order-events.ts` is pure and unit-tested:
`npm run test:unit`). Subscribers run in the **worker** (`MEDUSA_WORKER_MODE=worker`); the server
only emits the Medusa events onto Redis. So the analytics log lines are in `medusa-worker`, not
`medusa-server`.

| Medusa event | PostHog event | Notes |
| --- | --- | --- |
| `order.placed` | `Order Completed` | total/subtotal/shipping/discount in major units, `products[]`, `coupon` + `promo_codes[]`, `payment_method` (`cod` = `pp_system_default`, `shamcash`), `governorate` (shipping province, e.g. `sy-di`), `locale`, `is_first_order`, `email`, `phone` (E.164), and the attribution fields flat (`gclid`, `fbclid`, `utm_*`, `creator`, `creator_source`, `landing_path`, `referrer`). Also `$set` person properties, `$set_once: { first_order_at, first_creator }`, and a separate `identify`. |
| `order.canceled` | `Order Cancelled` | `reason` = `order.metadata.cancel_reason` when staff set one (Medusa records none). |
| `delivery.created` (admin "Mark as delivered" on a fulfillment) | `Order Delivered` | Sent once per order, when its last open fulfillment is delivered. |
| `payment.captured` (admin "Capture payment" after the courier remits cash) | `Payment Captured` | `value` = the captured payment amount. |
| (none yet) | `Order Refused` | Stub only: `orderRefusedProperties()` in `order-events.ts`; the phase-2 ops screen will emit it when staff mark a cash order refused at the door. |

**Identity.** The storefront stores the browser's PostHog id and its attribution snapshot on the
cart (`cart.metadata.posthog_distinct_id`, `cart.metadata.attribution`). Medusa's complete-cart
workflow copies cart metadata onto the order (verified with a real order: `order.metadata` carries
both), so the server events use the browser's `distinct_id` and the person in PostHog has both the
browsing and the purchase. Fallback when the id is missing (API orders, scripts): customer id, then
email. The subscriber also writes the finalised attribution back to `order.metadata.attribution`
(creator from a promo code wins over the link cookie), which is what staff see in the admin and what
creator payouts are exported from.

**Creator promo codes.** One Medusa promotion per creator, code = creator code. Put those
promotions in a campaign whose *campaign identifier* is `creators`: that is how the server knows a
code is a creator code (`CREATOR_CAMPAIGN_IDENTIFIER` in `order-events.ts`). A promo whose code
equals the cookie's creator also counts.

### The reverse proxy for the browser SDK

Caddy serves PostHog through the store's own domain so ad blockers and network filters do not eat
events (`infra/Caddyfile`, same block in `Caddyfile.dev`, directives from PostHog's "Using Caddy as a
reverse proxy" page, subpath variant):

- `https://<store>/ingest/static/*` and `/ingest/array/*` → `eu-assets.i.posthog.com` (SDK bundle, remote config)
- `https://<store>/ingest/*` → `eu.i.posthog.com` (events)

`handle_path` strips `/ingest`, the `Host` header is set to the upstream (PostHog answers 401
without it), `Cookie`/`Authorization` are not forwarded. It is always on and inert until the
storefront initialises posthog-js with `api_host: "/ingest"`. Validate after editing:
`docker run --rm -e MEDUSA_PUBLISHABLE_KEY=x -e STORE_DOMAIN=a.example -e CMS_DOMAIN=b.example -e MEDIA_DOMAIN=c.example -e ACME_EMAIL=a@b.c -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.10.2-alpine caddy validate --config /etc/caddy/Caddyfile`.
Smoke test once live: `curl -sI https://<store>/ingest/static/array.js | head -1` should be `200`.

### Development: the `local` provider

With `ANALYTICS_PROVIDER=local` the built-in `@medusajs/medusa/analytics-local` provider does not
send anything; it logs each `track`/`identify` call through Medusa's logger at **debug** level, as
one line per event with the full properties JSON:

```
debug: Tracking event: 'Order Completed', actor_id: '<distinct_id>', group: '-', properties: '{...}'
debug: Identifying user: '<distinct_id>', group: '-', properties: '{...}'
```

To see them, the process needs `LOG_LEVEL=debug` (in `infra/.env` for the containers; exported in the
shell for a host run, because Medusa creates its logger before it reads `.env`). In Docker:
`docker compose -p syria-tech-ecommerce logs -f medusa-worker | grep -E "Tracking event|Identifying user"`.
Note: Medusa 2.21.2's local provider has no file output; the "file" mentioned in `docs/analytics.md`
is this log stream (`docker compose logs` or redirect the host process to a file).

End-to-end check without a browser: `scripts/cod-checkout.sh` places a COD order through the Store
API; `CART_METADATA='{"posthog_distinct_id":"test-id","attribution":{"utm_source":"test"}}'` stores
the same metadata the storefront would, and the worker's `Order Completed` line must show
`actor_id: 'test-id'`, `"value":<order total>`, `"currency":"usd"`, `"governorate":"sy-di"`,
`"payment_method":"cod"`, `"utm_source":"test"`.

### Verifying an event reached PostHog

1. PostHog → **Activity** (live events): filter by event `Order Completed`; the row appears within
   seconds of the order (posthog-node batches, so allow ~10 s). Click it: `distinct_id` must be the
   browser's id (a UUID-like string, not an email), `value`/`currency`/`products` as above.
2. PostHog → **People**: search the buyer's email; the person must have the browser's pageviews
   *and* the `Order Completed` event, plus `email`, `phone`, `governorate`, `orders_count`,
   `first_order_at`.
3. If nothing arrives: `docker compose logs --tail 200 medusa-worker | grep analytics` shows either
   `[analytics] Order Completed <order id>` (sent; check the key and the PostHog project) or an
   `[analytics] ... failed` line with the cause. A missing worker means no subscribers run at all
   (`docker compose ps medusa-worker`).

### Destinations (configure in PostHog, not in code)

PostHog → Data pipelines → Destinations. Pointers only; the account owner provides the credentials
listed under "Open items" in `docs/analytics.md`:

- **Meta Conversions API**: map `Order Completed → Purchase` (value, currency, `products[]`),
  `Product Added → AddToCart`, `Checkout Started → InitiateCheckout`, `Product Viewed → ViewContent`.
  Needs the Pixel ID and a CAPI access token; the event carries `email`/`phone` for hashed matching.
- **Google Ads conversions**: `Order Completed` → the Purchase conversion action, using the `gclid`
  on the event/person; enhanced conversions with hashed email/phone. Refused orders → conversion
  adjustment when the destination supports it, otherwise a periodic offline import.
- Later, same pattern: TikTok, Snapchat.
