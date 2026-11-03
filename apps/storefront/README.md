# Syria Tech storefront

Next.js 15.5 / React 19 storefront for the Syria tech store, talking to Medusa 2.21.x and Strapi 5. Arabic (`/ar`, RTL) is the default locale, English (`/en`) the second. The spec is `docs/architecture.md` at the repo root; when this app and the spec disagree, fix the app.

## Origin and license

Started from the storefront app of [`medusajs/dtc-starter`](https://github.com/medusajs/dtc-starter) at commit **`f677db438f27294fc50e4c7c6612e71ff38eeff5`** (2026-10-09, "Merge pull request #73 from medusajs/fix/remove-static-params"). Only `apps/storefront` of that pnpm/turbo monorepo was taken and turned into a standalone app with its own `package.json` and `pnpm-lock.yaml`. The dtc-starter MIT notice is kept in `LICENSE`.

## Run it

Requirements: Node 22, pnpm 10 (`corepack enable`), a running Medusa 2.21 backend with a region that owns country `sy`, optionally Strapi.

```sh
cp .env.example .env.local      # fill NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY at least
pnpm install
pnpm dev -p 8001                # http://localhost:8001 -> redirects to /ar (8000 is often taken)
pnpm typecheck                  # tsc --noEmit
pnpm build && pnpm start        # production (output: standalone)
```

Docker (multi-stage, `node:22-alpine`, standalone output):

```sh
docker build -t syria-storefront .
docker run -p 3000:3000 \
  -e MEDUSA_BACKEND_URL=http://medusa-server:9000 \
  -e NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_... \
  -e STRAPI_URL=http://strapi:1337 syria-storefront
```

Nothing environment-specific is baked into the image (CI builds it before the publishable key exists). The Next.js server reads every variable at runtime from the container environment. The browser never needs the key: Caddy (`infra/Caddyfile`) adds it to `/store/*` requests that arrive without one. See `.env.example` for every variable; the production values are set in `infra/docker-compose.yml`.

## Environment

| Variable | Purpose |
| --- | --- |
| `MEDUSA_BACKEND_URL` | Internal Medusa URL used by the Next.js server (compose hostname in prod). |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | URL the browser uses for client-side Store API calls (search, option filters). Empty in prod = same origin (Caddy routes `/store`). |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable key for local `next dev`. |
| `MEDUSA_PUBLISHABLE_KEY`, `BASE_URL`, `STRAPI_MEDIA_URL` | Runtime counterparts used in the Docker image, where `NEXT_PUBLIC_*` values were inlined at build time. Set by `infra/docker-compose.yml`. |
| `NEXT_PUBLIC_DEFAULT_REGION` | Country whose region is the store region (`sy`). |
| `NEXT_PUBLIC_BASE_URL` | Public origin for absolute metadata URLs. |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `ar` (default) or `en`. |
| `STRAPI_URL` | Internal Strapi URL. Empty disables CMS content. The browser never calls Strapi. |
| `STRAPI_READ_TOKEN` | Optional read token (custom scope: find/findOne on the four SEO types). Not needed while the Public role can read them. |
| `NEXT_PUBLIC_MEDIA_HOSTNAME`, `NEXT_PUBLIC_STRAPI_MEDIA_URL` | Media hosts (MinIO behind Caddy / relative Strapi uploads). |
| `NEXT_PUBLIC_POSTHOG_KEY` / `POSTHOG_KEY` | PostHog project token (Cloud EU). Empty = analytics off. The runtime name is what docker-compose sets; the root layout reads it per request and hands it to the browser. |
| `NEXT_PUBLIC_POSTHOG_HOST` / `POSTHOG_HOST` | Optional. Where the browser sends events; empty = same-origin `/ingest` (Caddy proxies to PostHog EU). |
| `NEXT_PUBLIC_POSTHOG_UI_HOST` / `POSTHOG_UI_HOST` | Optional. The PostHog app URL (`https://eu.posthog.com`). |
| `NEXT_PUBLIC_ANALYTICS_DISABLED` / `ANALYTICS_DISABLED` | `true` turns analytics off even with a key set. |

## What changed vs dtc-starter

**Routing & i18n**

- `src/app/[countryCode]` is now `src/app/[locale]` with `next-intl` (`src/i18n/routing.ts`: locales `ar`, `en`, default `ar`, `localePrefix: "always"`). `src/middleware.ts` only does locale routing and keeps the `_medusa_cache_id` cookie; the per-country region map is gone.
- One country: the region is resolved server-side in `src/lib/data/regions.ts` (`getRegion()` prefers the region whose countries include `sy`, else the first). `countryCode` plumbing was removed from the data layer, pages and server actions (`cart.ts`, `products.ts`, `customer.ts`).
- `<html lang dir>` is set per locale in `src/app/[locale]/layout.tsx`; `NextIntlClientProvider` wraps the app. UI strings live in `messages/ar.json` and `messages/en.json` (274 keys each). Server actions that return user-facing errors translate them with `getTranslations`.
- Locale → Medusa header: `ar` → `x-medusa-locale: ar-SA`, `en` → `en` (`src/i18n/routing.ts` `MEDUSA_LOCALES`; Medusa has no plain `ar`, see the spike report). The header is added in `src/lib/config.ts`; on the client it is read from `<html lang>` so search calls don't round-trip to a server action. The language switcher (`modules/layout/components/locale-switcher`) updates the open cart's `locale` before navigating.
- Tailwind physical utilities (`ml/mr/pl/pr/left/right/text-left/text-right/rounded-l/r/border-l/r/space-x`) were replaced by logical ones (`ms/me/ps/pe/start/end/text-start/text-end/rounded-s/e/border-s/e/gap-x`) across `src`; directional icons carry `rtl:` variants. The search drawer slides from the end side in RTL.

**Money**

- `src/lib/util/money.ts` exports a single `formatMoney(amount, currencyCode, locale, options?)` built on `Intl.NumberFormat`; `convertToLocale` is gone and every price goes through it. Arabic formats with `ar-SY-u-nu-latn` (Latin digits, as on Syrian price tags); switch the tag in `INTL_LOCALES` to use Arabic-Indic digits. Prices are wrapped in `<bdi>` so they stay LTR inside Arabic text. No currency symbols are hard-coded anywhere.

**Address form** (`modules/checkout/components/address-fields`, shared by checkout and the account address book)

| Field | Medusa |
| --- | --- |
| Mobile `09XXXXXXXX` (also `+963…`, `00963…`, Arabic digits) → validated, stored `+9639XXXXXXXX` (`src/lib/util/phone.ts`) | `phone` |
| Governorate dropdown, 14 ISO 3166-2 codes with Arabic/English names (`src/lib/data/governorates.ts`) | `province`, lowercase `sy-di` |
| City / area (required) | `city` |
| Neighbourhood, street, building, floor | `address_1` |
| Nearest landmark | `address_2` |
| Delivery notes | `metadata.notes` |
| — | `country_code` fixed `sy`, `postal_code` never shown |

Parsing/validation is in `src/lib/util/address.ts` (`parseAddressForm`). The billing address form was removed: cash on delivery has no billing step, so shipping is copied to billing. Address summaries show the governorate name in the UI locale and the phone as `09XX XXX XXX`.

**Strapi content (SEO only, joined by handle)**

- `src/lib/data/cms.ts` is a typed read-only client for the four Strapi types (`article`, `landing-page`, `category-seo`, `product-seo`): `getProductSeo(handle, locale)`, `getCategorySeo(handle, locale)`, `getArticle(slug, locale)`, `listArticles(locale, { page, kind })`, `getLandingPage(slug, locale)`, plus `listArticleSlugs` / `listLandingPages` for the sitemap. Every call uses `next: { revalidate: 300 }`, a 4 s timeout and the optional `STRAPI_READ_TOKEN`; any failure yields `null` / an empty page, so Strapi being down never breaks a page. Rich text (markdown or Strapi blocks) becomes sanitised HTML in `src/lib/util/markdown.ts` (`marked` + `sanitize-html`); the same helper renders Medusa product descriptions. Locales of one document are mapped through `localizations` for hreflang.
- Product pages render `product-seo` (`longDescription`, FAQ, `seoTitle`/`seoDescription` overrides) below the Medusa description; category pages render the `category-seo` intro above the grid and its FAQ below.
- Routes: `/[locale]/guides` (paginated, filter by `kind`), `/[locale]/guides/[slug]` (body, FAQ, related Medusa products by `relatedProductHandles`, `Article` + `FAQPage` JSON-LD), `/[locale]/l/[slug]` (landing page: hero + `richtext` / `product-grid` / `faq-list` sections; `noindex` → robots meta and excluded from the sitemap).

**Repo content**

- Legal pages are markdown in `content/<locale>/<slug>.md` (front matter `title`, `description`, `updated`), served at `/[locale]/pages/[slug]` and linked from the footer (`src/lib/data/content.ts`). The homepage hero comes from `content/home.<locale>.json`; the product grid from the Medusa collection `featured`, falling back to the latest products. The Dockerfile copies `content/` into the runtime image.

**SEO plumbing**

- `src/app/sitemap.ts` (products, categories, guides, landing pages unless `noindex`, legal pages; both locales with hreflang `alternates`), `src/app/robots.ts`, `alternates.languages` on every public page type via `src/lib/util/seo.ts`, `BreadcrumbList` JSON-LD on product/category/guide/landing/legal pages, `Product` JSON-LD on product pages (offers in the variant's `calculated_price` currency, availability from inventory).

**Checkout**

- dtc-starter's step flow is kept (address → delivery → payment → review). `pp_system_default` renders as "Cash on delivery / الدفع عند الاستلام" with a one-line explanation (`src/lib/constants.tsx`, `payment-container`); the review step repeats the amount due in cash. Payment options are exactly what `/store/payment-providers?region_id` returns, so with COD alone enabled it is the only method, and a single method is pre-selected. The "for testing purposes only" badge on the manual provider was removed. Stripe wiring stays dormant for a later card provider.
- Delivery options come from Medusa filtered by the address's governorate service zone; a governorate without a zone shows an explanatory message instead of an empty list.

**Removed**: country/language selects (replaced by the locale switcher), Medusa onboarding CTAs, `next-sitemap.js` (not a dependency), billing-address form, profile billing address / password / order-transfer form components, `pg`, `react-country-flag`, `@types/pg`.

## Analytics (PostHog)

Spec: `docs/analytics.md`. Browser side only here; Medusa sends the money events.

- `src/instrumentation-client.ts` boots `posthog-js` once per page load: it reads `<script id="ph-config" type="application/json">` (rendered by the root layout from `POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_KEY` at request time), does nothing without a key or with `ANALYTICS_DISABLED=true`, and otherwise dynamic-imports the SDK on `requestIdleCallback` with `api_host` = same-origin `/ingest`, `ui_host` = `https://eu.posthog.com`, `defaults: "2026-05-30"` (automatic `$pageview` / `$pageleave` on load and pathname changes), `person_profiles: "always"`, `custom_campaign_params: ["ref"]`, `autocapture: false`. The SDK never blocks rendering and never sits in a page bundle.
- `src/lib/analytics/client.ts` queues calls made before the SDK is up and replays them with their original timestamps; every function is a no-op when analytics is off. `track.ts` has one typed function per spec event (`Product Viewed`, `Product List Viewed`, `Product Added`, `Product Removed`, `Cart Viewed`, `Checkout Started`, `Checkout Step Completed`, `Coupon Applied` / `Coupon Denied`, `Checkout Completed`, `Guide Viewed`, `Landing Page Viewed`), `trackers.tsx` the mount-time client components server pages render, `route-props.tsx` registers `locale` and `page_type` as super properties on every route change (and `before_send` stamps both from the event URL, so the automatic pageview fired inside `pushState` is right too).
- Identity: `CartAnalyticsSync` (store layout, checkout page) and `ensureCartAnalytics` (after add to cart) write `metadata.posthog_distinct_id` and `metadata.attribution` to the cart through the server action `attachAnalyticsToCart` (`src/lib/data/analytics.ts`; only the visitor's own cart, whitelisted keys). `CustomerIdentity` calls `posthog.identify(customer.id, { email, first_name, last_name })` for signed-in customers; logout calls `posthog.reset()`.
- Attribution (`attribution.ts`): `?ref=<code>` (or `utm_source=creator&utm_campaign=<code>`) fires `Creator Link Visited`, sets `first_creator`/`last_creator` person properties and a 30-day first-touch cookie `creator_ref`; the first landing (URL, referrer, time) is kept in `localStorage` and becomes the cart's `attribution` block (`creator`, `creator_source`, `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid`, `landing_path`, `referrer`, `landed_at`).
- `/ingest/*` is excluded from the locale middleware; the proxy itself is Caddy's job (`infra/Caddyfile`).

## Font

IBM Plex Sans Arabic, self-hosted via `next/font/local` (`src/lib/fonts.ts`). The six `.woff2` files in `src/fonts/` (Arabic and Latin subsets, weights 400/500/600, 212 KB total) were copied from the npm package `@fontsource/ibm-plex-sans-arabic@5.3.0` (kept as a devDependency for provenance); licence: SIL Open Font License 1.1, `src/fonts/LICENSE-OFL.txt`. Two `@font-face` families with `unicode-range` descriptors form the stack `--font-latin, --font-arabic`, so Arabic and Latin glyphs render in the same typeface.

## Project layout

```
messages/            ar.json, en.json
src/i18n/            routing (locales, Medusa/Intl locale maps), request config, navigation
src/app/[locale]/    (main) store pages, (checkout), [...rest] catch-all -> not-found
src/lib/data/        Medusa data layer (cart, products, customer, regions, catalog), cms (Strapi), content (repo markdown/JSON)
src/lib/util/        money, phone, address, product price, markdown (sanitised HTML), seo (hreflang + JSON-LD)
content/             <locale>/<slug>.md legal pages, home.<locale>.json hero
src/modules/         UI, by domain (dtc-starter structure)
src/fonts/           IBM Plex Sans Arabic subsets + OFL licence
```

## Known gaps

- Order-transfer pages (`/order/[id]/transfer/...`) still use dtc-starter's English copy.
- Dates use next-intl's `useFormatter` with the UI locale; the Gregorian calendar is assumed.
- `next lint` still uses dtc-starter's `.eslintrc.json`; `pnpm typecheck` (`tsc --noEmit`) is the gate.
- `next build` prints `Failed to copy traced files … page_client-reference-manifest.js` warnings for the `account/@dashboard` and `@login` parallel-route slots. This is Next 15's known false positive for parallel routes with `output: "standalone"`; the build exits 0 and the standalone server serves those pages.
- Landing-page dynamic-zone components are matched by the suffix of `__component` (`…richtext`, `…product-grid`, `…faq-list`); if the Strapi category prefix changes the match still holds, but a renamed component silently renders nothing.
- The cart is created with `locale: ar-SA|en`, but `/store/orders/:id` returned `locale: null` on Medusa 2.21.2 for the test order; the customer's language is not yet readable from the order for notifications.
- The `/store` listing and the navbar search use Medusa's Search module (`/store/search`); on a backend without the module they show the "couldn't load products" state rather than falling back to `/store/products`.
