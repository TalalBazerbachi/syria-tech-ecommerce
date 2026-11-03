"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { register } from "./client"
import { routePropsFor } from "./page-type"

/**
 * Registers `locale` and `page_type` as PostHog super properties on every
 * route change, per docs/analytics.md. Pageviews themselves are automatic
 * (`defaults: "2026-05-30"` = `history_change`); because that capture happens
 * inside `pushState`, before React has re-rendered, the init in
 * `instrumentation-client.ts` also stamps both properties from the event's
 * own URL in `before_send`, so the pageview never carries the previous page's
 * values. Must be rendered inside a `<Suspense>` (uses `useSearchParams`).
 */
export function AnalyticsRouteProps() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()

  useEffect(() => {
    if (!pathname) return
    register(routePropsFor(pathname, search ? `?${search}` : ""))
  }, [pathname, search])

  return null
}

export default AnalyticsRouteProps
