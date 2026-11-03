import type { Metadata } from "next"

import { defaultLocale, locales, type AppLocale } from "@i18n/routing"
import { getBaseURL } from "@lib/util/env"

/**
 * SEO plumbing shared by pages and the sitemap: absolute URLs, hreflang
 * alternates and JSON-LD builders. Pure functions; no fetching here.
 */

/** Paths are locale-less (`/products/x`); the locale prefix is added here. */
export type LocalePaths = Partial<Record<AppLocale, string>>

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, getBaseURL()).toString()
}

export function localePath(locale: AppLocale, pathname: string): string {
  const clean = pathname === "/" ? "" : pathname.replace(/^\/+/, "/")
  return `/${locale}${clean}`
}

/** The same locale-less path under every locale (Medusa-backed pages). */
export function samePathEverywhere(pathname: string): LocalePaths {
  return Object.fromEntries(locales.map((l) => [l, pathname])) as LocalePaths
}

/**
 * `alternates` for `generateMetadata`: canonical in the current locale,
 * one hreflang per locale the page exists in, `x-default` = default locale
 * (falls back to the current one when the default-locale version is missing).
 */
export function alternatesFor(
  locale: AppLocale,
  paths: LocalePaths
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {}
  for (const l of locales) {
    const p = paths[l]
    if (p !== undefined) {
      languages[l] = localePath(l, p)
    }
  }
  const current = paths[locale] ?? paths[defaultLocale] ?? "/"
  const xDefault = paths[defaultLocale] !== undefined ? defaultLocale : locale
  languages["x-default"] = localePath(xDefault, paths[xDefault] ?? current)

  return {
    canonical: localePath(locale, current),
    languages,
  }
}

/** Sitemap `alternates.languages` needs absolute URLs. */
export function sitemapAlternates(paths: LocalePaths): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const l of locales) {
    const p = paths[l]
    if (p !== undefined) {
      languages[l] = absoluteUrl(localePath(l, p))
    }
  }
  return languages
}

/* ------------------------------------------------------------- JSON-LD */

export type JsonLd = Record<string, unknown>

export type Crumb = { name: string; path: string }

export function breadcrumbJsonLd(locale: AppLocale, crumbs: Crumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(localePath(locale, crumb.path)),
    })),
  }
}

export function faqJsonLd(
  items: { question: string; answer: string }[]
): JsonLd | null {
  if (!items.length) {
    return null
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }
}

export function articleJsonLd(input: {
  locale: AppLocale
  path: string
  headline: string
  description: string | null
  image: string | null
  datePublished: string | null
  dateModified: string | null
  publisher: string
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    inLanguage: input.locale,
    mainEntityOfPage: absoluteUrl(localePath(input.locale, input.path)),
    publisher: { "@type": "Organization", name: input.publisher },
    author: { "@type": "Organization", name: input.publisher },
  }
}

export type ProductOffer = {
  price: number
  currency: string
  inStock: boolean
  sku: string | null
}

export function productJsonLd(input: {
  locale: AppLocale
  path: string
  name: string
  description: string | null
  images: string[]
  brand: string | null
  offers: ProductOffer[]
}): JsonLd {
  const url = absoluteUrl(localePath(input.locale, input.path))
  const offers = input.offers.map((offer) => ({
    "@type": "Offer",
    url,
    price: offer.price,
    priceCurrency: offer.currency.toUpperCase(),
    availability: offer.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    ...(offer.sku ? { sku: offer.sku } : {}),
  }))

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.images.length ? { image: input.images } : {}),
    ...(input.brand ? { brand: { "@type": "Brand", name: input.brand } } : {}),
    url,
    ...(offers.length === 1
      ? { offers: offers[0] }
      : offers.length > 1
        ? {
            offers: {
              "@type": "AggregateOffer",
              url,
              priceCurrency: offers[0].priceCurrency,
              lowPrice: Math.min(...input.offers.map((o) => o.price)),
              highPrice: Math.max(...input.offers.map((o) => o.price)),
              offerCount: offers.length,
              offers,
            },
          }
        : {}),
  }
}
