import type { MetadataRoute } from "next"

import { absoluteUrl } from "@lib/util/seo"
import { locales } from "@i18n/routing"

/**
 * Crawl rules. Account, cart, checkout and order pages are per-visitor and
 * never worth indexing; `/api` is the storefront's own route handlers.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["account", "cart", "checkout", "order", "verify-account"]
  const disallow = [
    "/api/",
    ...locales.flatMap((locale) => privatePaths.map((p) => `/${locale}/${p}`)),
  ]

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
