/**
 * Browser analytics bootstrap (Next.js `instrumentation-client`; runs once in
 * the browser before the app hydrates). See docs/analytics.md, "Where it runs".
 *
 * Configuration comes from `<script id="ph-config" type="application/json">`
 * rendered by the root layout at request time, because the image is built in
 * CI without the PostHog key and `NEXT_PUBLIC_*` values are inlined at build.
 * No key, or `disabled: true`, and this file does nothing at all.
 *
 * posthog-js itself is dynamic-imported on `requestIdleCallback`: it never
 * blocks rendering and stays out of the page bundles. Calls made before it is
 * up (trackers firing on hydration) are queued by `lib/analytics/client.ts`
 * and replayed with their original timestamps.
 */

import {
  readCreatorFromSearch,
  recordFirstTouch,
  setCreatorCookieOnce,
  trackCreatorLinkVisited,
} from "@lib/analytics/attribution"
import {
  disableAnalytics,
  setAnalyticsInstance,
} from "@lib/analytics/client"
import type { AnalyticsConfig } from "@lib/analytics/config"
import { routePropsFor } from "@lib/analytics/page-type"

const CONFIG_ELEMENT_ID = "ph-config"
const DEFAULT_UI_HOST = "https://eu.posthog.com"

function readConfig(): Partial<AnalyticsConfig> | null {
  const el = document.getElementById(CONFIG_ELEMENT_ID)
  if (!el?.textContent) {
    return null
  }
  try {
    return JSON.parse(el.textContent) as Partial<AnalyticsConfig>
  } catch {
    return null
  }
}

async function initPostHog(config: Partial<AnalyticsConfig>, key: string) {
  const { default: posthog } = await import("posthog-js")
  if (posthog.__loaded) {
    setAnalyticsInstance(posthog)
    return
  }

  posthog.init(key, {
    api_host: config.apiHost || `${window.location.origin}/ingest`,
    ui_host: config.uiHost || DEFAULT_UI_HOST,
    // 2026-05-30 defaults: automatic `$pageview` on load and on history
    // changes (pathname), `$pageleave`, sensible storage and recording defaults.
    defaults: "2026-05-30",
    // First-touch creator / UTM properties must stick on anonymous visitors.
    person_profiles: "always",
    // `?ref=` becomes `ref` / `$initial_ref` on events and the person as well.
    custom_campaign_params: ["ref"],
    // Only the named events of the spec; no click autocapture.
    autocapture: false,
    // `locale` / `page_type` are super properties registered on route change
    // (<AnalyticsRouteProps />). The automatic pageview is captured inside
    // `pushState`, before React re-renders, so derive both from the event's
    // own URL here as well; that keeps every event's values exact.
    before_send: (event) => {
      const url = event?.properties?.$current_url
      if (event && typeof url === "string") {
        try {
          const parsed = new URL(url)
          Object.assign(
            event.properties,
            routePropsFor(parsed.pathname, parsed.search)
          )
        } catch {
          // Leave the event untouched.
        }
      }
      return event
    },
    loaded: () => {
      // Runs before the initial automatic pageview (posthog fires it after
      // `loaded`), so the first `$pageview` already carries the super properties.
      posthog.register(
        routePropsFor(window.location.pathname, window.location.search)
      )
      setAnalyticsInstance(posthog)
    },
  })
  setAnalyticsInstance(posthog)
}

function start() {
  const config = readConfig()
  const key = config?.key?.trim()
  if (!config || config.disabled || !key) {
    disableAnalytics()
    return
  }

  // Landing-time attribution needs no SDK; the capture is queued until it is up.
  recordFirstTouch()
  const creator = readCreatorFromSearch(
    new URLSearchParams(window.location.search)
  )
  if (creator) {
    setCreatorCookieOnce(creator)
    trackCreatorLinkVisited(creator)
  }

  const load = () => {
    initPostHog(config, key).catch((err) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[analytics] posthog-js failed to load", err)
      }
    })
  }

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(load, { timeout: 3000 })
  } else {
    window.setTimeout(load, 500)
  }
}

if (typeof window !== "undefined") {
  if (
    document.readyState === "loading" &&
    !document.getElementById(CONFIG_ELEMENT_ID)
  ) {
    document.addEventListener("DOMContentLoaded", start, { once: true })
  } else {
    start()
  }
}
