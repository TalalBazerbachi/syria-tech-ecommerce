# Analytics and ad tracking (PostHog)

Status: implemented 2026-10-22 and verified locally (browser payloads captured through an echo server; server events through the local provider; cart metadata reaching the order confirmed). Waiting on the PostHog account, Meta and Google credentials, and the container rebuild. Facts verified against PostHog docs/source and the installed Medusa 2.21.2 packages. PostHog is the single event pipeline: the browser sends behaviour events, Medusa sends the money events, PostHog's destinations forward conversions to the ad platforms, and PostHog holds creator attribution. No separate GA4 and no Meta browser pixel at launch.

## Account and access (read first)

- **PostHog Cloud EU**, one project. PostHog's handbook states it cannot offer services to companies *based in* Syria, so the account is opened and billed by the store's non-Syrian entity (the same one that pays for hosting), and that is confirmed in writing with PostHog sales before launch. Visitors' traffic is not affected.
- Browser events go through **our own domain** (`/ingest` on the store, proxied by Caddy to PostHog EU), which also lifts capture by 10–30% past ad blockers. Medusa talks to `https://eu.i.posthog.com` directly.
- Self-hosting is out: PostHog's floor is 16 GB RAM and it is unsupported.
- Free tier: 1M events and 1M destination events per month; our volume fits.

## What the business needs from it

| Need | Events and data that serve it |
| --- | --- |
| Google Ads: optimise for purchases, know which campaigns sell | `Order Completed` with value, currency, order id, the `gclid` stored on the person, hashed email/phone for enhanced conversions; later a retraction when a cash order is refused |
| Meta Ads: same, plus the funnel events Meta optimises on | `Product Viewed`, `Product Added`, `Checkout Started`, `Order Completed`, with `fbclid` (→ `fbc`), `fbp`, hashed email/phone/name |
| UGC / creator partnerships: which creator brought which sales | First-touch creator from the link (`?ref=`) on the person, the creator's promo code on the order, a per-creator dashboard |
| Ourselves: where buyers drop out | The funnel from product view to order, per locale and governorate |

## Naming

Event names follow the **Segment e-commerce spec in Title Case**, because PostHog's ad destinations map them out of the box (`Product Viewed → ViewContent`, `Product Added → AddToCart`, `Checkout Started → InitiateCheckout`, `Order Completed → Purchase`). Properties are snake_case. Amounts in **major units** of the order currency (`79`, not 7900), `currency` ISO lower-case (`usd`), ids are Medusa ids. One `Order Completed` per order, sent **server-side** from Medusa; the browser never sends it.

## Events

### Browser (posthog-js through `/ingest`)

| Event | When | Properties |
| --- | --- | --- |
| `$pageview` | automatic on load and route change (`defaults: "2026-05-30"`) | super properties `locale`, `page_type` (`home`, `product`, `category`, `store`, `search`, `guide`, `landing`, `checkout`, `order_confirmed`, `page`, `account`) registered on every route change |
| `Product Viewed` | product page rendered | `product_id`, `sku`, `name`, `category`, `price`, `currency`, `url` |
| `Product List Viewed` | store / category / search results | `list_id` (`store`, `category:<handle>`, `search`), `category`, `query`, `result_count` |
| `Product Added` / `Product Removed` | cart line added / removed | `cart_id`, `product_id`, `variant_id`, `sku`, `name`, `variant`, `price`, `quantity`, `currency` |
| `Cart Viewed` | cart page | `cart_id`, `value`, `currency`, `products[]` |
| `Checkout Started` | checkout opened | `cart_id`, `value`, `currency`, `products[]` |
| `Checkout Step Completed` | address / delivery / payment / review submitted | `cart_id`, `step` (1–4), `step_name`, `governorate` (ISO code), `shipping_method`, `payment_method` |
| `Coupon Applied` / `Coupon Denied` | code accepted / rejected | `cart_id`, `coupon` |
| `Checkout Completed` | confirmation page shown (hint only; the server owns the sale) | `order_id`, `cart_id` |
| `Creator Link Visited` | landing with `?ref=` | `creator` |
| `Guide Viewed`, `Landing Page Viewed` | SEO pages | `slug`, `kind` |

`products[]` items: `product_id`, `sku`, `name`, `variant`, `price`, `quantity`, `category`.

### Server (Medusa Analytics Module → PostHog)

| Event | Trigger | Properties |
| --- | --- | --- |
| `Order Completed` | `order.placed` | `order_id`, `display_id`, `value` (total), `subtotal`, `shipping`, `discount`, `currency`, `products[]`, `coupon` (first code), `promo_codes[]`, `payment_method` (`cod`, `shamcash`), `governorate`, `locale`, `is_first_order`, `email`, `phone` (E.164), `gclid`, `fbclid`, `ttclid`, `utm_*`, `creator`, `creator_source` (`promo` \| `link`), `landing_path`, `referrer` |
| `Order Cancelled` | `order.canceled` | `order_id`, `value`, `currency`, `reason` |
| `Order Delivered` | fulfillment marked delivered | `order_id`, `value`, `currency` |
| `Order Refused` | staff marks a cash order refused (phase-2 ops screen; stub only now) | `order_id`, `value`, `currency` |
| `Payment Captured` | cash counted / wallet confirmed | `order_id`, `value`, `currency`, `payment_method` |

Attribution fields are flat on `Order Completed` (destinations read event properties; they do not dig into nested objects) and are also stored on the order as `metadata.attribution` for staff and creator payouts.

## Identity

- posthog-js runs with `person_profiles: "always"` so anonymous buyers (guest checkout is the norm) still get first-touch person properties.
- The browser writes `posthog.get_distinct_id()` and its attribution snapshot into the cart: `POST /store/carts/:id { metadata: { posthog_distinct_id, attribution } }`. Medusa's complete-cart workflow copies cart metadata onto the order, so the server event uses the **same** `distinct_id` (verified in core-flows source).
- On `Order Completed` the server also calls `identify` with `email`, `phone`, `first_name`, `last_name`, `governorate`, `locale`, `first_order_at`, `orders_count`, and sends `$set_once: { first_creator }` on the event. Destinations read person data as it exists at processing time, so the event itself carries `email`/`phone` too.
- Logged-in customers: `posthog.identify(customer_id, { email })` after login/signup, `posthog.reset()` on logout.

## Attribution (ads and creators)

posthog-js captures `utm_source/medium/campaign/content/term`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid` and more on events and as `$initial_*` person properties. `ref` is added via `custom_campaign_params: ["ref"]`.

- **Creator links:** `https://<store>/…?ref=<creator-code>`. On landing the storefront captures `Creator Link Visited`, sets `$set_once: { first_creator, first_creator_at }` and `$set: { last_creator, last_creator_at }`, and keeps the code in a first-party cookie `creator_ref` for **30 days**.
- **Creator promo codes:** one Medusa promotion per creator, code = creator code (`SARA10`), inside the Medusa campaign whose identifier is `creators` (that is how the backend recognises a creator code; a code equal to the cookie creator also counts). The local dev database holds the campaign and a test promotion `TESTCREATOR10` (10% off); verified on 2026-10-22 with order #39, where the code overrode a different creator from the link cookie (`creator_source: promo`).
- On `Order Completed`: `creator` = code from the promotion if present, else the cookie value; `creator_source` says which.
- **Payout rule** (so dashboards and payments agree): a sale counts for a creator when the order used their code; otherwise when their link was the first touch within 30 days.

## Destinations (PostHog data pipelines; all currently marked alpha by PostHog)

| Destination | Trigger | Needs | Notes |
| --- | --- | --- | --- |
| Meta Ads Conversions API | `Order Completed` → Purchase; optionally the three funnel events | Pixel ID, CAPI system-user access token | Hashes email/name itself; builds `fbc` from `fbclid`; `event_id` = event uuid (dedup if a browser pixel is ever added). No browser pixel at launch. |
| Google Ads Conversions | `Order Completed` | Google OAuth, 10-digit customer ID, a conversion action with "Enhanced conversions via API" and offline conversions enabled | Uses `gclid` from the person, else hashed email/phone. Supports no retractions. |
| TikTok / Snapchat | later | pixel + token | same pattern (`ttclid`, `sccid`) |

**Cash on delivery and ad platforms.** `Order Completed` fires when the order is placed (ad platforms need fast signals). Refused orders are corrected afterwards: a small job (phase 2) sends a Google Ads **retraction** by `order_id` between 24 h and 54 days after the conversion, through the Google Ads / Data Manager API; Meta has no retraction, so if refusals turn out high we can switch Meta's Purchase to `Order Delivered`. Owner decision, default = at placement.

## Where it runs

- Browser: `posthog-js` initialised in `apps/storefront/instrumentation-client.ts` with `api_host: "/ingest"`, `ui_host: "https://eu.posthog.com"`, `defaults: "2026-05-30"`, `person_profiles: "always"`, `custom_campaign_params: ["ref"]`. The key is read at request time on the server and handed to the client (the image is built without it). `NEXT_PUBLIC_ANALYTICS_DISABLED=true` turns it off.
- Proxy: Caddy routes `/ingest/static/*` and `/ingest/array/*` → `eu-assets.i.posthog.com`, `/ingest/*` → `eu.i.posthog.com`, with the `Host` header set to the upstream and `Cookie`/`Authorization` stripped.
- Server: Medusa Analytics Module (`@medusajs/medusa/analytics`) with provider `@medusajs/medusa/analytics-posthog` (options `posthogEventsKey` from `POSTHOG_EVENTS_KEY`, `posthogHost`) when `ANALYTICS_PROVIDER=posthog`, and `@medusajs/medusa/analytics-local` otherwise (it logs each event at debug level; run with `LOG_LEVEL=debug` to see them; it writes no file). Subscribers in `apps/backend/src/subscribers/analytics-*.ts`, all fail-safe; pure mappers in `src/lib/analytics/` with unit tests. Note: in-process `query.graph` returns amounts as `BigNumber` objects, which the mappers convert to numbers.
- Consent: Syria has no cookie-consent law in force; cookies on by default, one sentence in the privacy page.

## Dashboards to create in PostHog (after the account exists)

1. Store funnel: `Product Viewed` → `Product Added` → `Checkout Started` → `Order Completed`, by locale and device.
2. Ads: `Order Completed` count and value by `utm_source`/`utm_campaign`, and by presence of `gclid`/`fbclid`; Marketing analytics (beta) for spend import once ad accounts are connected.
3. Creators: orders and value per `creator` (last touch) and per person `first_creator` (first touch), split by `creator_source`.
4. COD quality: placed vs delivered vs refused per governorate.

## Open items needing the owner

- The non-Syrian entity for the PostHog account; written confirmation from PostHog.
- Meta: Pixel ID and a Conversions API access token.
- Google Ads: customer ID, OAuth user for the destination, the purchase conversion action; later, Data Manager API access for retractions (new integrations must use it from 2026-06-15).
- Creator codes and discounts; confirm the 30-day first-touch rule.
- Whether Meta's Purchase should fire at placement (default) or at delivery.
