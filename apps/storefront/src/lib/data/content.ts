import "server-only"

import { promises as fs } from "node:fs"
import path from "node:path"
import { cache } from "react"

import { locales, type AppLocale } from "@i18n/routing"
import { markdownToPlainText, markdownToSafeHtml } from "@lib/util/markdown"

/**
 * Editorial content that lives in this repo (decided 2026-10-20, see
 * docs/architecture.md): legal pages as markdown under
 * `content/<locale>/<slug>.md` and the homepage hero as
 * `content/home.<locale>.json`. Changing them is a deploy, on purpose.
 */

const CONTENT_DIR = path.join(process.cwd(), "content")

/** Only `[a-z0-9-]` slugs are ever turned into a file path. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type LegalPage = {
  slug: string
  locale: AppLocale
  title: string
  /** Sanitised HTML of everything below the first `# Title`. */
  html: string
  description: string | null
  /** Optional ISO date from the `updated: YYYY-MM-DD` front-matter line. */
  updated: string | null
}

type FrontMatter = Record<string, string>

function parseFrontMatter(source: string): { meta: FrontMatter; body: string } {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!match) {
    return { meta: {}, body: source }
  }
  const meta: FrontMatter = {}
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  }
  return { meta, body: source.slice(match[0].length) }
}

export const getLegalPage = cache(
  async (slug: string, locale: AppLocale): Promise<LegalPage | null> => {
    if (!SLUG_RE.test(slug)) {
      return null
    }
    let source: string
    try {
      source = await fs.readFile(
        path.join(CONTENT_DIR, locale, `${slug}.md`),
        "utf8"
      )
    } catch {
      return null
    }

    const { meta, body } = parseFrontMatter(source)
    const headingMatch = body.match(/^#\s+(.+?)\s*$/m)
    const title = meta.title || headingMatch?.[1]?.trim() || slug
    const withoutTitle = headingMatch
      ? body.replace(headingMatch[0], "").trim()
      : body.trim()
    const html = markdownToSafeHtml(withoutTitle)
    if (!html) {
      return null
    }

    return {
      slug,
      locale,
      title,
      html,
      description: meta.description || markdownToPlainText(withoutTitle),
      updated: meta.updated || null,
    }
  }
)

/** Slugs available in `locale` (used by the sitemap and the footer). */
export const listLegalPageSlugs = cache(
  async (locale: AppLocale): Promise<string[]> => {
    try {
      const files = await fs.readdir(path.join(CONTENT_DIR, locale))
      return files
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.slice(0, -3))
        .filter((slug) => SLUG_RE.test(slug))
        .sort()
    } catch {
      return []
    }
  }
)

/** Footer order; slugs not listed here follow alphabetically. */
const LEGAL_PAGE_ORDER = ["about", "delivery", "returns", "warranty"]

/** `{ slug, title }` for every legal page of a locale, in footer order. */
export const listLegalPages = cache(
  async (locale: AppLocale): Promise<{ slug: string; title: string }[]> => {
    const slugs = await listLegalPageSlugs(locale)
    const rank = (slug: string) => {
      const i = LEGAL_PAGE_ORDER.indexOf(slug)
      return i === -1 ? LEGAL_PAGE_ORDER.length : i
    }
    const pages = await Promise.all(
      slugs
        .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
        .map(async (slug) => {
          const page = await getLegalPage(slug, locale)
          return page ? { slug, title: page.title } : null
        })
    )
    return pages.filter((p): p is { slug: string; title: string } => p !== null)
  }
)

/** Locales in which a legal page exists, for hreflang alternates. */
export async function legalPageLocales(slug: string): Promise<AppLocale[]> {
  const found: AppLocale[] = []
  for (const locale of locales) {
    if ((await listLegalPageSlugs(locale)).includes(slug)) {
      found.push(locale)
    }
  }
  return found
}

export type HomeContent = {
  hero: {
    heading: string
    text: string | null
    image: string | null
    imageAlt: string | null
    ctaLabel: string | null
    ctaHref: string | null
  }
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export const getHomeContent = cache(
  async (locale: AppLocale): Promise<HomeContent | null> => {
    try {
      const raw = await fs.readFile(
        path.join(CONTENT_DIR, `home.${locale}.json`),
        "utf8"
      )
      const json = JSON.parse(raw) as { hero?: Record<string, unknown> }
      const hero = json?.hero ?? {}
      const heading = pickString(hero.heading)
      if (!heading) {
        return null
      }
      return {
        hero: {
          heading,
          text: pickString(hero.text),
          image: pickString(hero.image),
          imageAlt: pickString(hero.imageAlt),
          ctaLabel: pickString(hero.ctaLabel),
          ctaHref: pickString(hero.ctaHref),
        },
      }
    } catch {
      return null
    }
  }
)
