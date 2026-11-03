import { defaultLocale, isAppLocale, type AppLocale } from "@i18n/routing"

/** `page_type` values from docs/analytics.md (`$pageview` super properties). */
export type PageType =
  | "home"
  | "product"
  | "category"
  | "store"
  | "search"
  | "guide"
  | "landing"
  | "checkout"
  | "order_confirmed"
  | "page"
  | "account"

export type RouteProps = { locale: AppLocale; page_type: PageType }

/** `/ar/products/x` -> `{ locale: "ar", path: "/products/x" }`; `/en` -> `/`. */
export function splitLocale(pathname: string): { locale: AppLocale; path: string } {
  const [, first, ...rest] = pathname.split("/")
  if (isAppLocale(first)) {
    const path = "/" + rest.join("/")
    return { locale: first, path: path === "/" ? "/" : path.replace(/\/+$/, "") }
  }
  return { locale: defaultLocale, path: pathname.replace(/\/+$/, "") || "/" }
}

/** InstantSearch `routing` writes the query as `?<index>[query]=…`. */
function hasSearchQuery(search: string | undefined): boolean {
  if (!search) return false
  const params = new URLSearchParams(search)
  for (const [key, value] of params) {
    if ((key.endsWith("[query]") || key === "query" || key === "q") && value.trim()) {
      return true
    }
  }
  return false
}

/** Classifies a locale-less path. Collections count as `category` (a curated product list). */
export function pageTypeFor(path: string, search?: string): PageType {
  if (path === "/") return "home"
  if (path.startsWith("/products/")) return "product"
  if (path.startsWith("/categories/") || path.startsWith("/collections/")) {
    return "category"
  }
  if (path === "/store") return hasSearchQuery(search) ? "search" : "store"
  if (path === "/guides" || path.startsWith("/guides/")) return "guide"
  if (path.startsWith("/l/")) return "landing"
  if (path === "/checkout") return "checkout"
  if (/^\/order\/[^/]+\/confirmed$/.test(path)) return "order_confirmed"
  if (path === "/account" || path.startsWith("/account/")) return "account"
  return "page"
}

/** The super properties for a URL (`pathname` with the locale prefix, plus `search`). */
export function routePropsFor(pathname: string, search?: string): RouteProps {
  const { locale, path } = splitLocale(pathname)
  return { locale, page_type: pageTypeFor(path, search) }
}
