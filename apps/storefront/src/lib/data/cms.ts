import "server-only"

import { isAppLocale, type AppLocale } from "@i18n/routing"
import { richTextToSafeHtml } from "@lib/util/markdown"

/**
 * Read-only client for the SEO content in Strapi (see docs/architecture.md,
 * "Strapi content types (SEO only)").
 *
 * Rules every function here follows:
 * - Server-only; the browser never calls Strapi.
 * - Cached by Next's fetch cache for 5 minutes, 4 s timeout.
 * - Any failure (Strapi down, 404, bad JSON, no `STRAPI_URL`) yields `null`
 *   or an empty list. SEO content is optional on every page.
 * - Records reference Medusa by *handle strings*; nothing is synced.
 * - Rich text is returned as sanitised HTML, never raw.
 */

export type CmsImage = {
  url: string
  alt: string | null
  width: number | null
  height: number | null
}

export type FaqItem = {
  question: string
  /** Plain answer text (for JSON-LD). */
  answer: string
  /** Sanitised HTML of the answer (markdown allowed). */
  answerHtml: string
}

/** Slug of the same document in each locale (from `localizations`). */
export type LocaleSlugs = Partial<Record<AppLocale, string>>

export type ProductSeo = {
  longDescriptionHtml: string | null
  seoTitle: string | null
  seoDescription: string | null
  faq: FaqItem[]
}

export type CategorySeo = {
  introHtml: string | null
  seoTitle: string | null
  seoDescription: string | null
  faq: FaqItem[]
}

export const ARTICLE_KINDS = ["guide", "comparison", "howto", "news"] as const
export type ArticleKind = (typeof ARTICLE_KINDS)[number]

export type ArticleSummary = {
  documentId: string
  locale: AppLocale
  slug: string
  title: string
  excerpt: string | null
  kind: ArticleKind | null
  cover: CmsImage | null
  publishedAt: string | null
  updatedAt: string | null
  slugs: LocaleSlugs
}

export type Article = ArticleSummary & {
  bodyHtml: string | null
  seoTitle: string | null
  seoDescription: string | null
  relatedProductHandles: string[]
  relatedCategoryHandle: string | null
  faq: FaqItem[]
}

export type LandingHero = {
  heading: string | null
  text: string | null
  image: CmsImage | null
  ctaLabel: string | null
  ctaHref: string | null
}

export type LandingSection =
  | { type: "richtext"; html: string }
  | {
      type: "product-grid"
      heading: string | null
      collectionHandle: string | null
      productHandles: string[]
    }
  | { type: "faq-list"; heading: string | null; items: FaqItem[] }

export type LandingPage = {
  documentId: string
  locale: AppLocale
  slug: string
  title: string
  seoTitle: string | null
  seoDescription: string | null
  noindex: boolean
  hero: LandingHero | null
  sections: LandingSection[]
  publishedAt: string | null
  updatedAt: string | null
  slugs: LocaleSlugs
}

export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  pageCount: number
  total: number
}

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_READ_TOKEN = process.env.STRAPI_READ_TOKEN
const REVALIDATE_SECONDS = 300
const TIMEOUT_MS = 4000
export const ARTICLES_PAGE_SIZE = 12

type Entry = Record<string, unknown>

type StrapiList = {
  data?: Entry[]
  meta?: { pagination?: { page?: number; pageSize?: number; pageCount?: number; total?: number } }
}

/* ------------------------------------------------------------------ fetch */

async function strapiGet(
  path: string,
  params: Record<string, string>,
  tags: string[]
): Promise<StrapiList | null> {
  if (!STRAPI_URL) {
    return null
  }

  let url: URL
  try {
    url = new URL(path, STRAPI_URL)
  } catch {
    return null
  }
  // The Public role in Strapi 5 honours `?status=draft`; pin published so no
  // query shape added later can surface unpublished entries.
  url.searchParams.set("status", "published")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(STRAPI_READ_TOKEN ? { Authorization: `Bearer ${STRAPI_READ_TOKEN}` } : {}),
      },
      next: { revalidate: REVALIDATE_SECONDS, tags: ["cms", ...tags] },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      return null
    }
    const json = (await response.json()) as StrapiList
    return json && typeof json === "object" ? json : null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------- normalise */

/** Strapi 5 returns flat entries; tolerate the v4 `attributes` nesting too. */
function attrs(entry: Entry | undefined | null): Entry | null {
  if (!entry || typeof entry !== "object") {
    return null
  }
  const nested = (entry as { attributes?: unknown }).attributes
  if (nested && typeof nested === "object") {
    return { ...(nested as Entry), id: entry.id, documentId: entry.documentId }
  }
  return entry
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function absoluteMediaUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url) {
    return null
  }
  if (/^https?:\/\//.test(url)) {
    return url
  }
  // Runtime name first (docker-compose); the NEXT_PUBLIC_ one is for `next dev`.
  const base =
    process.env.STRAPI_MEDIA_URL ||
    process.env.NEXT_PUBLIC_STRAPI_MEDIA_URL ||
    STRAPI_URL
  try {
    return base ? new URL(url, base).toString() : null
  } catch {
    return null
  }
}

function toImage(value: unknown): CmsImage | null {
  if (!value || typeof value !== "object") {
    return null
  }
  // v4: { data: { attributes } } ; v5: flat
  const raw = "data" in (value as Entry) ? (value as { data: unknown }).data : value
  const media = attrs(Array.isArray(raw) ? (raw[0] as Entry) : (raw as Entry))
  const url = absoluteMediaUrl(media?.url)
  if (!url) {
    return null
  }
  return {
    url,
    alt: str(media?.alternativeText),
    width: typeof media?.width === "number" ? media.width : null,
    height: typeof media?.height === "number" ? media.height : null,
  }
}

function toFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => {
      const a = attrs(item as Entry)
      const question = str(a?.question)
      const answerHtml = richTextToSafeHtml(a?.answer)
      const answer =
        typeof a?.answer === "string"
          ? a.answer.trim()
          : answerHtml?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? ""
      return question && answerHtml ? { question, answer, answerHtml } : null
    })
    .filter((item): item is FaqItem => item !== null)
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && !!v.trim())
  }
  if (typeof value === "string") {
    // A JSON field saved as text, or a comma-separated list.
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return toStringArray(parsed)
      }
    } catch {}
    return value.split(",").map((v) => v.trim()).filter(Boolean)
  }
  return []
}

/** `{ ar: slug, en: slug }` from the entry itself plus its `localizations`. */
function toSlugs(entry: Entry, locale: AppLocale): LocaleSlugs {
  const slugs: LocaleSlugs = {}
  const own = str(entry.slug)
  if (own) {
    slugs[locale] = own
  }
  const raw = entry.localizations
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
      ? ((raw as { data: unknown[] }).data)
      : []
  for (const item of list) {
    const a = attrs(item as Entry)
    const l = a?.locale
    const s = str(a?.slug)
    if (isAppLocale(l) && s && !slugs[l]) {
      slugs[l] = s
    }
  }
  return slugs
}

function toKind(value: unknown): ArticleKind | null {
  return typeof value === "string" && (ARTICLE_KINDS as readonly string[]).includes(value)
    ? (value as ArticleKind)
    : null
}

function toArticleSummary(entry: Entry, locale: AppLocale): ArticleSummary | null {
  const slug = str(entry.slug)
  const title = str(entry.title)
  if (!slug || !title) {
    return null
  }
  return {
    documentId: str(entry.documentId) ?? String(entry.id ?? slug),
    locale,
    slug,
    title,
    excerpt: str(entry.excerpt),
    kind: toKind(entry.kind),
    cover: toImage(entry.cover),
    publishedAt: str(entry.publishedAt),
    updatedAt: str(entry.updatedAt),
    slugs: toSlugs(entry, locale),
  }
}

function toArticle(entry: Entry, locale: AppLocale): Article | null {
  const summary = toArticleSummary(entry, locale)
  if (!summary) {
    return null
  }
  return {
    ...summary,
    bodyHtml: richTextToSafeHtml(entry.body),
    seoTitle: str(entry.seoTitle),
    seoDescription: str(entry.seoDescription),
    relatedProductHandles: toStringArray(entry.relatedProductHandles),
    relatedCategoryHandle: str(entry.relatedCategoryHandle),
    faq: toFaq(entry.faq),
  }
}

function toHero(value: unknown): LandingHero | null {
  const a = attrs(value as Entry)
  if (!a) {
    return null
  }
  const hero: LandingHero = {
    heading: str(a.heading),
    text: str(a.text),
    image: toImage(a.image),
    ctaLabel: str(a.ctaLabel),
    ctaHref: str(a.ctaHref),
  }
  return hero.heading || hero.text || hero.image ? hero : null
}

function toSections(value: unknown): LandingSection[] {
  if (!Array.isArray(value)) {
    return []
  }
  const sections: LandingSection[] = []
  for (const raw of value) {
    const a = attrs(raw as Entry)
    const component = str(a?.__component)?.toLowerCase() ?? ""
    if (!a) {
      continue
    }
    if (component.endsWith("richtext") || component.endsWith("rich-text")) {
      const html = richTextToSafeHtml(a.body)
      if (html) {
        sections.push({ type: "richtext", html })
      }
    } else if (component.endsWith("product-grid")) {
      const productHandles = toStringArray(a.productHandles)
      const collectionHandle = str(a.collectionHandle)
      if (productHandles.length || collectionHandle) {
        sections.push({
          type: "product-grid",
          heading: str(a.heading),
          collectionHandle,
          productHandles,
        })
      }
    } else if (component.endsWith("faq-list") || component.endsWith("faq")) {
      const items = toFaq(a.items ?? a.faq)
      if (items.length) {
        sections.push({ type: "faq-list", heading: str(a.heading), items })
      }
    }
  }
  return sections
}

function toLandingPage(entry: Entry, locale: AppLocale): LandingPage | null {
  const slug = str(entry.slug)
  const title = str(entry.title)
  if (!slug || !title) {
    return null
  }
  return {
    documentId: str(entry.documentId) ?? String(entry.id ?? slug),
    locale,
    slug,
    title,
    seoTitle: str(entry.seoTitle),
    seoDescription: str(entry.seoDescription),
    noindex: entry.noindex === true,
    hero: toHero(entry.hero),
    sections: toSections(entry.sections),
    publishedAt: str(entry.publishedAt),
    updatedAt: str(entry.updatedAt),
    slugs: toSlugs(entry, locale),
  }
}

/* ------------------------------------------------------------- populate */

const LOCALIZATION_FIELDS = {
  "populate[localizations][fields][0]": "slug",
  "populate[localizations][fields][1]": "locale",
}

const ARTICLE_POPULATE = {
  "populate[cover]": "true",
  "populate[faq]": "true",
  ...LOCALIZATION_FIELDS,
}

const LANDING_POPULATE = {
  "populate[hero][populate]": "*",
  "populate[sections][populate]": "*",
  ...LOCALIZATION_FIELDS,
}

/* -------------------------------------------------------------- public */

export async function getProductSeo(
  handle: string,
  locale: AppLocale
): Promise<ProductSeo | null> {
  if (!handle) {
    return null
  }
  const json = await strapiGet(
    "/api/product-seos",
    {
      locale,
      "filters[productHandle][$eq]": handle,
      "populate[faq]": "true",
      "pagination[pageSize]": "1",
    },
    [`cms-product-${handle}`]
  )
  const entry = attrs(json?.data?.[0])
  if (!entry) {
    return null
  }
  return {
    longDescriptionHtml: richTextToSafeHtml(entry.longDescription),
    seoTitle: str(entry.seoTitle),
    seoDescription: str(entry.seoDescription),
    faq: toFaq(entry.faq),
  }
}

export async function getCategorySeo(
  handle: string,
  locale: AppLocale
): Promise<CategorySeo | null> {
  if (!handle) {
    return null
  }
  const json = await strapiGet(
    "/api/category-seos",
    {
      locale,
      "filters[categoryHandle][$eq]": handle,
      "populate[faq]": "true",
      "pagination[pageSize]": "1",
    },
    [`cms-category-${handle}`]
  )
  const entry = attrs(json?.data?.[0])
  if (!entry) {
    return null
  }
  return {
    introHtml: richTextToSafeHtml(entry.intro),
    seoTitle: str(entry.seoTitle),
    seoDescription: str(entry.seoDescription),
    faq: toFaq(entry.faq),
  }
}

export async function getArticle(
  slug: string,
  locale: AppLocale
): Promise<Article | null> {
  if (!slug) {
    return null
  }
  const json = await strapiGet(
    "/api/articles",
    {
      locale,
      "filters[slug][$eq]": slug,
      "pagination[pageSize]": "1",
      ...ARTICLE_POPULATE,
    },
    [`cms-article-${slug}`]
  )
  const entry = attrs(json?.data?.[0])
  return entry ? toArticle(entry, locale) : null
}

const EMPTY_PAGE = <T,>(page: number): Paginated<T> => ({
  items: [],
  page,
  pageSize: ARTICLES_PAGE_SIZE,
  pageCount: 0,
  total: 0,
})

/**
 * Published articles, newest first. Returns an empty page (never throws)
 * when Strapi is unavailable.
 */
export async function listArticles(
  locale: AppLocale,
  options: { page?: number; pageSize?: number; kind?: ArticleKind | null } = {}
): Promise<Paginated<ArticleSummary>> {
  const page = Math.max(1, Math.floor(options.page ?? 1))
  const pageSize = Math.min(Math.max(1, options.pageSize ?? ARTICLES_PAGE_SIZE), 100)
  const json = await strapiGet(
    "/api/articles",
    {
      locale,
      "sort[0]": "publishedAt:desc",
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
      ...(options.kind ? { "filters[kind][$eq]": options.kind } : {}),
      "populate[cover]": "true",
      ...LOCALIZATION_FIELDS,
    },
    ["cms-articles"]
  )
  if (!json?.data) {
    return EMPTY_PAGE<ArticleSummary>(page)
  }
  const items = json.data
    .map((raw) => {
      const entry = attrs(raw)
      return entry ? toArticleSummary(entry, locale) : null
    })
    .filter((item): item is ArticleSummary => item !== null)
  const pagination = json.meta?.pagination ?? {}
  return {
    items,
    page: pagination.page ?? page,
    pageSize: pagination.pageSize ?? pageSize,
    pageCount: pagination.pageCount ?? (items.length ? 1 : 0),
    total: pagination.total ?? items.length,
  }
}

export async function getLandingPage(
  slug: string,
  locale: AppLocale
): Promise<LandingPage | null> {
  if (!slug) {
    return null
  }
  const json = await strapiGet(
    "/api/landing-pages",
    {
      locale,
      "filters[slug][$eq]": slug,
      "pagination[pageSize]": "1",
      ...LANDING_POPULATE,
    },
    [`cms-landing-${slug}`]
  )
  const entry = attrs(json?.data?.[0])
  return entry ? toLandingPage(entry, locale) : null
}

/** Every published landing page of a locale (slug, noindex, dates) for the sitemap. */
export async function listLandingPages(
  locale: AppLocale
): Promise<Pick<LandingPage, "slug" | "noindex" | "updatedAt" | "slugs">[]> {
  const json = await strapiGet(
    "/api/landing-pages",
    {
      locale,
      "fields[0]": "slug",
      "fields[1]": "noindex",
      "fields[2]": "updatedAt",
      "pagination[pageSize]": "100",
      ...LOCALIZATION_FIELDS,
    },
    ["cms-landing-pages"]
  )
  return (json?.data ?? [])
    .map((raw) => {
      const entry = attrs(raw)
      const slug = str(entry?.slug)
      return entry && slug
        ? {
            slug,
            noindex: entry.noindex === true,
            updatedAt: str(entry.updatedAt),
            slugs: toSlugs(entry, locale),
          }
        : null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

/** Every published article of a locale (slug + dates) for the sitemap. */
export async function listArticleSlugs(
  locale: AppLocale
): Promise<Pick<ArticleSummary, "slug" | "updatedAt" | "slugs">[]> {
  const json = await strapiGet(
    "/api/articles",
    {
      locale,
      "fields[0]": "slug",
      "fields[1]": "updatedAt",
      "pagination[pageSize]": "100",
      ...LOCALIZATION_FIELDS,
    },
    ["cms-articles"]
  )
  return (json?.data ?? [])
    .map((raw) => {
      const entry = attrs(raw)
      const slug = str(entry?.slug)
      return entry && slug
        ? { slug, updatedAt: str(entry.updatedAt), slugs: toSlugs(entry, locale) }
        : null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}
