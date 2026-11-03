"use client"

import { useEffect } from "react"

import { attachAnalyticsToCart } from "@lib/data/analytics"
import { buildAttribution } from "./attribution"
import { isAnalyticsDisabled, whenAnalyticsReady } from "./client"

/**
 * Identity, per docs/analytics.md: the browser's PostHog `distinct_id` and
 * the attribution block are written to the cart (`metadata.posthog_distinct_id`,
 * `metadata.attribution`) when the cart is created or first seen on the
 * client. Medusa copies cart metadata to the order, so the server-side
 * `order_placed` lands on the same PostHog person.
 *
 * `ensureCartAnalytics` is idempotent per cart and browser session. It waits
 * for the SDK (so the distinct id is the real one); if the SDK never loads
 * (blocked, offline) it still writes the attribution after a grace period,
 * and upgrades the record with the distinct id if the SDK shows up later.
 */

const MARK_PREFIX = "st_cart_analytics:"
const SDK_GRACE_MS = 4000

type Mark = "full" | "partial"

function readMark(cartId: string): Mark | null {
  try {
    return window.sessionStorage.getItem(MARK_PREFIX + cartId) as Mark | null
  } catch {
    return null
  }
}

function writeMark(cartId: string, mark: Mark) {
  try {
    window.sessionStorage.setItem(MARK_PREFIX + cartId, mark)
  } catch {
    // Without sessionStorage we may write twice per cart; harmless.
  }
}

const inFlight = new Set<string>()

async function write(cartId: string, distinctId: string | null) {
  const token = `${cartId}:${distinctId ?? ""}`
  if (inFlight.has(token)) return
  inFlight.add(token)
  try {
    const ok = await attachAnalyticsToCart(cartId, {
      posthog_distinct_id: distinctId,
      attribution: buildAttribution(),
    })
    if (ok) {
      writeMark(cartId, distinctId ? "full" : "partial")
    }
  } catch {
    // Analytics must never surface as a storefront error.
  } finally {
    inFlight.delete(token)
  }
}

export function ensureCartAnalytics(cartId: string) {
  if (typeof window === "undefined" || !cartId || isAnalyticsDisabled()) {
    return
  }
  if (readMark(cartId) === "full") {
    return
  }

  let done = false
  whenAnalyticsReady((posthog) => {
    done = true
    void write(cartId, posthog.get_distinct_id() ?? null)
  })

  if (!done && readMark(cartId) !== "partial") {
    window.setTimeout(() => {
      if (!done && readMark(cartId) === null) {
        void write(cartId, null)
      }
    }, SDK_GRACE_MS)
  }
}

/**
 * Mounted by layouts/pages that already hold the cart. `attached` short-cuts
 * the write when the cart already carries a distinct id (server-side check).
 */
export function CartAnalyticsSync({
  cartId,
  attached,
}: {
  cartId: string | null | undefined
  attached: boolean
}) {
  useEffect(() => {
    if (!cartId) return
    if (attached) {
      writeMark(cartId, "full")
      return
    }
    ensureCartAnalytics(cartId)
  }, [cartId, attached])

  return null
}
