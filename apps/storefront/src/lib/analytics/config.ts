/**
 * Server-side: the PostHog configuration handed to the browser at request
 * time through `<script id="ph-config" type="application/json">` (see
 * `config-script.tsx` and `src/instrumentation-client.ts`).
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time and the image is built in CI
 * before the key exists, so the plain runtime names (`POSTHOG_KEY`, ...) win;
 * the `NEXT_PUBLIC_*` names only serve local `next dev`.
 */

export type AnalyticsConfig = {
  key: string | null
  disabled: boolean
  /** Where events go. Empty = same-origin `/ingest` (Caddy proxies to PostHog EU). */
  apiHost: string | null
  /** The PostHog app. Empty = `https://eu.posthog.com`. */
  uiHost: string | null
}

const truthy = (value: string | undefined) =>
  ["1", "true", "yes"].includes((value ?? "").trim().toLowerCase())

export function getAnalyticsConfig(): AnalyticsConfig {
  return {
    key: process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || null,
    disabled:
      truthy(process.env.ANALYTICS_DISABLED) ||
      truthy(process.env.NEXT_PUBLIC_ANALYTICS_DISABLED),
    apiHost:
      process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || null,
    uiHost:
      process.env.POSTHOG_UI_HOST ||
      process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ||
      null,
  }
}

/** JSON safe to inline in a `<script>`: `<` escaped so `</script>` cannot break out. */
export function serializeAnalyticsConfig(config: AnalyticsConfig): string {
  return JSON.stringify(config).replace(/</g, "\\u003c")
}
