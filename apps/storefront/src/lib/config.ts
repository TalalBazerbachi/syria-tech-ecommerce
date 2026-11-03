import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

/**
 * Where the Medusa Store API lives.
 *
 * - On the server the internal URL (`MEDUSA_BACKEND_URL`, e.g. the compose
 *   hostname `http://medusa-server:9000`) is preferred.
 * - In the browser only `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is available; when
 *   it is unset the store is assumed to be served behind the same origin
 *   (Caddy routes `/store` to Medusa), so the page's own origin is used.
 */
function resolveBackendUrl() {
  if (typeof window === "undefined") {
    return (
      process.env.MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "http://localhost:9000"
    )
  }

  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || window.location.origin
}

export const MEDUSA_BACKEND_URL = resolveBackendUrl()

/**
 * Publishable key. Next.js inlines `NEXT_PUBLIC_*` at build time, in server
 * code too, and the image is built in CI before the key exists. So the server
 * reads the plain runtime variable `MEDUSA_PUBLISHABLE_KEY` first (set by
 * docker-compose); `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` only serves local
 * `next dev`. In the browser both are normally empty and Caddy injects the key
 * on `/store/*` requests.
 */
function resolvePublishableKey() {
  if (typeof window === "undefined") {
    return (
      process.env.MEDUSA_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
      undefined
    )
  }
  return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || undefined
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: resolvePublishableKey(),
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

// Every Store API call carries `x-medusa-locale` derived from the UI locale
// (`ar` -> `ar-SA`, `en` -> `en`) so the Translation module returns Arabic
// titles, option names and category names on Arabic pages.
sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = (init?.headers ?? {}) as Record<string, string | null>
  let localeHeader: Record<string, string> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  init = {
    ...init,
    headers: {
      ...localeHeader,
      ...headers,
    },
  }
  return originalFetch(input, init)
}
