# CMS (Strapi 5) — SEO content only

Strapi holds the store's SEO content with native i18n (`en`, `ar`) and draft & publish. It is not
connected to Medusa: no plugin, module, webhook or token in either direction. Where an entry is
about a Medusa product or category, the editor types the Medusa **handle** into a plain string
field and the storefront joins by handle at render time.

Content types (`src/api/*`), spec in `docs/architecture.md`:

- `article` — guides, comparisons, how-tos, news (`/api/articles`)
- `landing-page` — hero + dynamic zone of sections (`/api/landing-pages`)
- `category-seo` — intro/SEO text/FAQ for one category handle (`/api/category-seos`)
- `product-seo` — long description/SEO text/FAQ for one product handle (`/api/product-seos`)

Components (`src/components`): `shared.faq-item`; `sections.hero`, `sections.richtext`,
`sections.product-grid`, `sections.faq-list`.

- `src/index.ts` bootstrap creates the `en` and `ar` locales and grants the Public role `find` +
  `findOne` on the four types. The storefront needs no token.
- `src/middlewares/published-only.ts` forces `status=published` on unauthenticated `/api/*` requests,
  so drafts are never readable anonymously (Strapi 5 alone would honour `?status=draft`).
- Media is stored in MinIO through the S3 upload provider (see `config/plugins.ts`).
- Run locally: `npm install && cp .env.example .env && npm run develop` (needs Postgres).
- In Docker everything comes from `infra/docker-compose*.yml` and `infra/.env`.
