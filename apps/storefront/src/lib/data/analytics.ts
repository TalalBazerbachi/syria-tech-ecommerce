"use server"

import { sdk } from "@lib/config"
import type { Attribution } from "@lib/analytics/attribution"
import { getAuthHeaders, getCartId } from "./cookies"

/**
 * Writes the browser's analytics identity onto the visitor's cart:
 * `metadata.posthog_distinct_id` and `metadata.attribution` (see
 * docs/analytics.md, Identity and Attribution). Medusa copies cart metadata to
 * the order, so the server-side `order_placed` can reuse both.
 *
 * Medusa 2.21 merges `metadata` on cart update (verified against the running
 * backend), so existing keys are kept. The action only touches the cart the
 * request's own `_medusa_cart_id` cookie points at, and only accepts the
 * whitelisted, size-capped values below: it is callable by anyone.
 */

const ATTRIBUTION_KEYS: ReadonlyArray<keyof Attribution> = [
  "creator",
  "creator_source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "ttclid",
  "landing_path",
  "referrer",
  "landed_at",
]

const MAX_VALUE_LENGTH = 1000

function cleanString(value: unknown, max = MAX_VALUE_LENGTH): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function cleanAttribution(input: unknown): Record<string, string | null> | null {
  if (!input || typeof input !== "object") return null
  const source = input as Record<string, unknown>
  const out: Record<string, string | null> = {}
  for (const key of ATTRIBUTION_KEYS) {
    out[key] = cleanString(source[key])
  }
  if (out.creator_source && out.creator_source !== "link") {
    out.creator_source = null
  }
  if (!out.creator) {
    out.creator_source = null
  }
  return out
}

export async function attachAnalyticsToCart(
  cartId: string,
  data: {
    posthog_distinct_id: string | null
    attribution?: Partial<Attribution> | null
  }
): Promise<boolean> {
  if (typeof cartId !== "string" || !cartId.startsWith("cart_")) {
    return false
  }
  // Only the visitor's own cart.
  if ((await getCartId()) !== cartId) {
    return false
  }

  const metadata: Record<string, unknown> = {}
  const distinctId = cleanString(data?.posthog_distinct_id, 200)
  if (distinctId) {
    metadata.posthog_distinct_id = distinctId
  }
  const attribution = cleanAttribution(data?.attribution)
  if (attribution) {
    metadata.attribution = attribution
  }
  if (Object.keys(metadata).length === 0) {
    return false
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.cart.update(cartId, { metadata }, {}, headers)
    return true
  } catch {
    // Analytics never breaks the storefront; the next page load retries.
    return false
  }
}
