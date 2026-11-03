import { HttpTypes } from "@medusajs/types"

import { getPaymentInfo } from "@lib/constants"
import { capture } from "./client"

/**
 * One function per browser event of docs/analytics.md ("Browser" table).
 * Names follow the Segment e-commerce spec in Title Case so PostHog's ad
 * destinations map them for free; properties are snake_case and built here
 * with exactly the spec's names. Amounts are the major-unit numbers Medusa
 * already returns (what the storefront shows); `currency` is lower-case ISO.
 * Safe to import from server components: nothing touches the SDK until a
 * function is called in the browser.
 */

type PricedVariant = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount?: number | null
    currency_code?: string | null
  } | null
}

const lower = (code: string | null | undefined) =>
  code ? code.toLowerCase() : null

function variantPrice(variant: PricedVariant | undefined | null) {
  const amount = variant?.calculated_price?.calculated_amount
  return typeof amount === "number" ? amount : null
}

function cheapestVariant(product: HttpTypes.StoreProduct) {
  return ((product.variants ?? []) as PricedVariant[])
    .filter((v) => typeof v.calculated_price?.calculated_amount === "number")
    .sort(
      (a, b) =>
        (a.calculated_price?.calculated_amount ?? 0) -
        (b.calculated_price?.calculated_amount ?? 0)
    )[0]
}

const primaryCategory = (product: Pick<HttpTypes.StoreProduct, "categories">) =>
  product.categories?.[0]?.handle ?? null

// --- products[] -------------------------------------------------------------

/** One entry of `products[]` (Cart Viewed, Checkout Started). */
export type ProductItem = {
  product_id: string | null
  sku: string | null
  name: string | null
  variant: string | null
  price: number | null
  quantity: number
  /** Category handle. Cart line items do not expose it (store API), so `null` there. */
  category: string | null
}

export function lineItemsToProducts(
  items: HttpTypes.StoreCartLineItem[] | null | undefined
): ProductItem[] {
  return (items ?? []).map((item) => ({
    product_id: item.product_id ?? null,
    sku: item.variant_sku ?? item.variant?.sku ?? null,
    name: item.product_title ?? item.title ?? null,
    variant: item.variant_title ?? null,
    price: typeof item.unit_price === "number" ? item.unit_price : null,
    quantity: item.quantity,
    category: null,
  }))
}

/** A small, serialisable cart summary to hand from server to client components. */
export type CartSnapshot = {
  id: string
  total: number
  currency_code: string
  products: ProductItem[]
}

export function cartSnapshot(cart: HttpTypes.StoreCart): CartSnapshot {
  return {
    id: cart.id,
    total: cart.total ?? 0,
    currency_code: cart.currency_code,
    products: lineItemsToProducts(cart.items),
  }
}

// --- Product Viewed ---------------------------------------------------------

export function trackProductViewed(
  product: HttpTypes.StoreProduct,
  region: Pick<HttpTypes.StoreRegion, "currency_code">,
  variantId?: string | null
) {
  const variants = (product.variants ?? []) as PricedVariant[]
  const variant =
    (variantId && variants.find((v) => v.id === variantId)) ||
    cheapestVariant(product)

  capture("Product Viewed", {
    product_id: product.id,
    sku: variant?.sku ?? null,
    name: product.title,
    category: primaryCategory(product),
    price: variantPrice(variant),
    currency:
      lower(variant?.calculated_price?.currency_code) ??
      lower(region.currency_code),
    url: typeof window !== "undefined" ? window.location.href : null,
  })
}

// --- Product List Viewed ----------------------------------------------------

/** `list_id`: `store`, `category:<handle>`, `search`. */
export type ListId = "store" | "search" | `category:${string}`

export const categoryListId = (handle: string): ListId => `category:${handle}`

export function trackProductListViewed(props: {
  list_id: ListId
  /** Category handle for `category:*` lists. */
  category?: string | null
  query?: string | null
  result_count: number
}) {
  capture("Product List Viewed", {
    list_id: props.list_id,
    category: props.category ?? null,
    query: props.query || null,
    result_count: props.result_count,
  })
}

// --- Product Added / Product Removed ----------------------------------------

export function trackProductAdded(props: {
  cartId: string
  product: HttpTypes.StoreProduct
  variant: HttpTypes.StoreProductVariant
  quantity: number
  /** Fallback when the variant carries no `calculated_price`. */
  currency?: string | null
}) {
  const variant = props.variant as PricedVariant
  capture("Product Added", {
    cart_id: props.cartId,
    product_id: props.product.id,
    variant_id: variant.id,
    sku: variant.sku ?? null,
    name: props.product.title,
    variant: variant.title ?? null,
    price: variantPrice(variant),
    quantity: props.quantity,
    currency:
      lower(variant.calculated_price?.currency_code) ?? lower(props.currency),
  })
}

export function trackProductRemoved(
  item: HttpTypes.StoreCartLineItem,
  cart: Pick<HttpTypes.StoreCart, "id" | "currency_code">
) {
  capture("Product Removed", {
    cart_id: cart.id,
    product_id: item.product_id ?? null,
    variant_id: item.variant_id ?? null,
    sku: item.variant_sku ?? item.variant?.sku ?? null,
    name: item.product_title ?? item.title ?? null,
    variant: item.variant_title ?? null,
    price: typeof item.unit_price === "number" ? item.unit_price : null,
    quantity: item.quantity,
    currency: lower(cart.currency_code),
  })
}

// --- Cart Viewed / Checkout Started -----------------------------------------

function cartProperties(cart: CartSnapshot) {
  return {
    cart_id: cart.id,
    value: cart.total,
    currency: lower(cart.currency_code),
    products: cart.products,
  }
}

export function trackCartViewed(cart: CartSnapshot) {
  capture("Cart Viewed", cartProperties(cart))
}

export function trackCheckoutStarted(cart: CartSnapshot) {
  capture("Checkout Started", cartProperties(cart))
}

// --- Checkout Step Completed ------------------------------------------------

export type CheckoutStepName = "address" | "delivery" | "payment" | "review"

const CHECKOUT_STEPS: Record<CheckoutStepName, number> = {
  address: 1,
  delivery: 2,
  payment: 3,
  review: 4,
}

/** `pp_system_default` -> `cod`, Stripe-likes -> `card`, anything else its raw id. */
export function paymentMethodKey(providerId?: string | null): string | null {
  if (!providerId) return null
  return getPaymentInfo(providerId)?.key ?? providerId
}

export function trackCheckoutStepCompleted(props: {
  cart_id: string
  step_name: CheckoutStepName
  /** Governorate as stored on the address (`sy-di`). */
  governorate?: string | null
  shipping_method?: string | null
  payment_method?: string | null
}) {
  capture("Checkout Step Completed", {
    cart_id: props.cart_id,
    step: CHECKOUT_STEPS[props.step_name],
    step_name: props.step_name,
    governorate: props.governorate ?? null,
    shipping_method: props.shipping_method ?? null,
    payment_method: props.payment_method ?? null,
  })
}

// --- Coupon Applied / Coupon Denied -----------------------------------------

export function trackCouponApplied(props: { cart_id: string; coupon: string }) {
  capture("Coupon Applied", { cart_id: props.cart_id, coupon: props.coupon })
}

export function trackCouponDenied(props: { cart_id: string; coupon: string }) {
  capture("Coupon Denied", { cart_id: props.cart_id, coupon: props.coupon })
}

// --- Checkout Completed (hint only; `Order Completed` comes from Medusa) ----

export function trackCheckoutCompleted(props: {
  order_id: string
  cart_id: string | null
}) {
  capture("Checkout Completed", {
    order_id: props.order_id,
    cart_id: props.cart_id,
  })
}

// --- SEO pages -------------------------------------------------------------

export function trackGuideViewed(props: { slug: string; kind: string | null }) {
  capture("Guide Viewed", { slug: props.slug, kind: props.kind ?? null })
}

export function trackLandingPageViewed(props: {
  slug: string
  kind?: string | null
}) {
  capture("Landing Page Viewed", {
    slug: props.slug,
    kind: props.kind ?? "landing",
  })
}
