"use client"

import { HttpTypes } from "@medusajs/types"
import { useEffect } from "react"

import { consumeCheckoutCartId } from "./checkout-session"
import {
  CartSnapshot,
  ListId,
  trackCartViewed,
  trackCheckoutCompleted,
  trackCheckoutStarted,
  trackGuideViewed,
  trackLandingPageViewed,
  trackProductListViewed,
  trackProductViewed,
} from "./track"

/**
 * Invisible client components that fire one event when a server-rendered
 * page mounts. Each derives an identity key from its subject so a re-render
 * with the same subject does not fire twice, while a new subject (another
 * product, another results page) does.
 */

function useTrackOnce(key: string, fire: () => void) {
  useEffect(() => {
    fire()
    // `fire` closes over props that `key` already summarises.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

export function TrackProductViewed({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: Pick<HttpTypes.StoreRegion, "currency_code">
}) {
  useTrackOnce(`Product Viewed:${product.id}`, () =>
    trackProductViewed(product, region)
  )
  return null
}

export function TrackProductListViewed({
  list_id,
  category,
  query,
  result_count,
  page,
}: {
  list_id: ListId
  category?: string | null
  query?: string | null
  result_count: number
  /** Part of the identity so paging through results fires again. */
  page?: number | string | null
}) {
  useTrackOnce(
    `Product List Viewed:${list_id}:${query ?? ""}:${page ?? ""}:${result_count}`,
    () => trackProductListViewed({ list_id, category, query, result_count })
  )
  return null
}

export function TrackCartViewed({ cart }: { cart: CartSnapshot }) {
  useTrackOnce(`Cart Viewed:${cart.id}`, () => trackCartViewed(cart))
  return null
}

const CHECKOUT_STARTED_KEY = "st_checkout_started"

/** Once per cart per browser session: reloading or stepping through checkout does not re-fire. */
export function TrackCheckoutStarted({ cart }: { cart: CartSnapshot }) {
  useTrackOnce(`Checkout Started:${cart.id}`, () => {
    try {
      if (window.sessionStorage.getItem(CHECKOUT_STARTED_KEY) === cart.id) {
        return
      }
      window.sessionStorage.setItem(CHECKOUT_STARTED_KEY, cart.id)
    } catch {
      // No sessionStorage: fire anyway.
    }
    trackCheckoutStarted(cart)
  })
  return null
}

const COMPLETED_PREFIX = "st_checkout_completed:"

/** Once per order: the confirmation page is often reloaded or revisited. */
export function TrackCheckoutCompleted({ orderId }: { orderId: string }) {
  useTrackOnce(`Checkout Completed:${orderId}`, () => {
    try {
      if (window.localStorage.getItem(COMPLETED_PREFIX + orderId)) {
        return
      }
      window.localStorage.setItem(COMPLETED_PREFIX + orderId, "1")
    } catch {
      // No localStorage: fire anyway.
    }
    trackCheckoutCompleted({
      order_id: orderId,
      cart_id: consumeCheckoutCartId(),
    })
  })
  return null
}

export function TrackGuideViewed({
  slug,
  kind,
}: {
  slug: string
  kind: string | null
}) {
  useTrackOnce(`Guide Viewed:${slug}`, () => trackGuideViewed({ slug, kind }))
  return null
}

export function TrackLandingPageViewed({ slug }: { slug: string }) {
  useTrackOnce(`Landing Page Viewed:${slug}`, () =>
    trackLandingPageViewed({ slug })
  )
  return null
}
