import type { MetadataRoute } from "next"

import { listAllCategoryHandles, listAllProductHandles } from "@lib/data/catalog"
import { listArticleSlugs, listLandingPages } from "@lib/data/cms"
import { listLegalPageSlugs } from "@lib/data/content"
import {
  absoluteUrl,
  localePath,
  samePathEverywhere,
  sitemapAlternates,
  type LocalePaths,
} from "@lib/util/seo"
import { defaultLocale, locales, type AppLocale } from "@i18n/routing"

/**
 * One sitemap for both locales. Every URL carries hreflang alternates
 * (`alternates.languages`), which is how Google reads them from a sitemap.
 * Rendered per request: Medusa and Strapi are not reachable at build time,
 * and each upstream call is cached for 5 minutes anyway.
 */
export const dynamic = "force-dynamic"

type Entry = MetadataRoute.Sitemap[number]

/** One entry per locale a page exists in, each pointing at all its siblings. */
function entries(
  paths: LocalePaths,
  options: { lastModified?: string | null; changeFrequency?: Entry["changeFrequency"]; priority?: number } = {}
): Entry[] {
  const languages = sitemapAlternates(paths)
  const lastModified = options.lastModified ? new Date(options.lastModified) : undefined
  return (Object.entries(paths) as [AppLocale, string][]).map(([locale, path]) => ({
    url: absoluteUrl(localePath(locale, path)),
    ...(lastModified && !Number.isNaN(lastModified.getTime()) ? { lastModified } : {}),
    ...(options.changeFrequency ? { changeFrequency: options.changeFrequency } : {}),
    ...(options.priority !== undefined ? { priority: options.priority } : {}),
    alternates: { languages },
  }))
}

/** Merge per-locale CMS listings into one map keyed by the default-locale URL. */
function mergeLocalized<T extends { slug: string; updatedAt: string | null; slugs: Partial<Record<AppLocale, string>> }>(
  perLocale: { locale: AppLocale; rows: T[] }[],
  toPath: (slug: string) => string
): { paths: LocalePaths; lastModified: string | null }[] {
  const groups = new Map<string, { paths: LocalePaths; lastModified: string | null }>()
  for (const { locale, rows } of perLocale) {
    for (const row of rows) {
      const paths: LocalePaths = { [locale]: toPath(row.slug) }
      for (const [l, s] of Object.entries(row.slugs) as [AppLocale, string][]) {
        paths[l] = toPath(s)
      }
      // The default-locale slug (or, failing that, this locale's) identifies the document.
      const key = paths[defaultLocale] ?? paths[locale] ?? row.slug
      const existing = groups.get(key)
      if (existing) {
        Object.assign(existing.paths, paths)
        if (row.updatedAt && (!existing.lastModified || row.updatedAt > existing.lastModified)) {
          existing.lastModified = row.updatedAt
        }
      } else {
        groups.set(key, { paths, lastModified: row.updatedAt })
      }
    }
  }
  return Array.from(groups.values())
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, articlesPerLocale, landingPerLocale, legalPerLocale] =
    await Promise.all([
      listAllProductHandles().catch(() => []),
      listAllCategoryHandles().catch(() => []),
      Promise.all(
        locales.map(async (locale) => ({
          locale,
          rows: await listArticleSlugs(locale).catch((): Awaited<ReturnType<typeof listArticleSlugs>> => []),
        }))
      ),
      Promise.all(
        locales.map(async (locale) => ({
          locale,
          rows: await listLandingPages(locale).catch((): Awaited<ReturnType<typeof listLandingPages>> => []),
        }))
      ),
      Promise.all(
        locales.map(async (locale) => ({
          locale,
          slugs: await listLegalPageSlugs(locale).catch((): string[] => []),
        }))
      ),
    ])

  const out: Entry[] = []

  out.push(...entries(samePathEverywhere("/"), { changeFrequency: "daily", priority: 1 }))
  out.push(...entries(samePathEverywhere("/store"), { changeFrequency: "daily", priority: 0.8 }))
  out.push(...entries(samePathEverywhere("/guides"), { changeFrequency: "weekly", priority: 0.6 }))

  for (const category of categories) {
    out.push(
      ...entries(samePathEverywhere(`/categories/${category.handle}`), {
        lastModified: category.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    )
  }

  for (const product of products) {
    out.push(
      ...entries(samePathEverywhere(`/products/${product.handle}`), {
        lastModified: product.updated_at,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    )
  }

  for (const guide of mergeLocalized(articlesPerLocale, (slug) => `/guides/${slug}`)) {
    out.push(...entries(guide.paths, { lastModified: guide.lastModified, changeFrequency: "monthly", priority: 0.6 }))
  }

  // Landing pages flagged `noindex` stay out of the sitemap entirely.
  const indexable = landingPerLocale.map(({ locale, rows }) => ({
    locale,
    rows: rows.filter((row) => !row.noindex),
  }))
  for (const landing of mergeLocalized(indexable, (slug) => `/l/${slug}`)) {
    out.push(...entries(landing.paths, { lastModified: landing.lastModified, changeFrequency: "monthly", priority: 0.6 }))
  }

  const legalSlugs = new Set(legalPerLocale.flatMap(({ slugs }) => slugs))
  for (const slug of Array.from(legalSlugs).sort()) {
    const paths: LocalePaths = {}
    for (const { locale, slugs } of legalPerLocale) {
      if (slugs.includes(slug)) {
        paths[locale] = `/pages/${slug}`
      }
    }
    out.push(...entries(paths, { changeFrequency: "yearly", priority: 0.3 }))
  }

  return out
}
