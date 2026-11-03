/**
 * Pure mappers from a Medusa order (as loaded by ./load-order.ts) to the
 * PostHog event properties defined in docs/analytics.md ("Server" events,
 * "Identity", "Attribution"). No I/O here so the mapping is unit-testable
 * against a saved order JSON.
 *
 * Event names follow the Segment e-commerce spec in Title Case (PostHog's ad
 * destinations map `Order Completed` -> Purchase out of the box); properties
 * are snake_case. Amounts: Medusa 2.x stores money in MAJOR units of the order
 * currency (an order total of 552 is 552.00 USD), so nothing is divided by 100.
 */

export const ANALYTICS_EVENTS = {
  ORDER_COMPLETED: "Order Completed",
  ORDER_CANCELLED: "Order Cancelled",
  ORDER_DELIVERED: "Order Delivered",
  ORDER_REFUSED: "Order Refused",
  PAYMENT_CAPTURED: "Payment Captured",
} as const

/** Promotions whose Medusa campaign has this identifier are creator codes (one promotion per creator). */
export const CREATOR_CAMPAIGN_IDENTIFIER = "creators"

/**
 * A money value as Medusa hands it over in-process: a plain number (HTTP/JSON
 * shape), a numeric string, a raw `{ value, precision }` object, or a
 * `BigNumber` instance from @medusajs/framework/utils (what `query.graph` and
 * the Order Module return for decorated totals and `unit_price`; it exposes
 * `.numeric` and serialises to a number via `toJSON()`).
 */
export type AnalyticsMoney =
  | number
  | string
  | { value?: string | number; numeric?: number; toJSON?: () => unknown }
  | null
  | undefined

export interface AnalyticsOrderItem {
  id?: string
  product_id?: string | null
  variant_id?: string | null
  variant_sku?: string | null
  title?: string | null
  product_title?: string | null
  variant_title?: string | null
  product_collection?: string | null
  product_type?: string | null
  quantity: number | string
  unit_price?: AnalyticsMoney
}

export interface AnalyticsAddress {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  province?: string | null
  city?: string | null
  country_code?: string | null
}

export interface AnalyticsPromotion {
  id?: string
  code?: string | null
  campaign?: { campaign_identifier?: string | null } | null
}

export interface AnalyticsOrder {
  id: string
  display_id?: number | null
  status?: string | null
  email?: string | null
  customer_id?: string | null
  currency_code: string
  locale?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | Date | null
  canceled_at?: string | Date | null
  total?: AnalyticsMoney
  subtotal?: AnalyticsMoney
  /** Items before tax, shipping and discounts; Medusa's `subtotal` includes shipping. */
  item_subtotal?: AnalyticsMoney
  shipping_total?: AnalyticsMoney
  discount_total?: AnalyticsMoney
  tax_total?: AnalyticsMoney
  items?: AnalyticsOrderItem[] | null
  shipping_address?: AnalyticsAddress | null
  customer?: {
    id?: string
    email?: string | null
    phone?: string | null
    first_name?: string | null
    last_name?: string | null
  } | null
  payment_collections?:
    | Array<{
        id?: string
        payments?: Array<{ id?: string; provider_id?: string | null }> | null
        payment_sessions?: Array<{ id?: string; provider_id?: string | null }> | null
      }>
    | null
  promotions?: AnalyticsPromotion[] | null
  fulfillments?: Array<{ id?: string; delivered_at?: string | Date | null; canceled_at?: string | Date | null }> | null
  cart?: { id?: string; metadata?: Record<string, unknown> | null } | null
}

/** Attribution block as the storefront writes it to cart.metadata.attribution (all optional). */
export interface Attribution {
  creator?: string | null
  creator_source?: "promo" | "link" | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  gclid?: string | null
  fbclid?: string | null
  ttclid?: string | null
  landing_path?: string | null
  referrer?: string | null
  [key: string]: unknown
}

/** The attribution keys that go FLAT on `Order Completed` (destinations do not read nested objects). */
export const FLAT_ATTRIBUTION_KEYS = [
  "gclid",
  "fbclid",
  "ttclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "creator",
  "creator_source",
  "landing_path",
  "referrer",
] as const
export type FlatAttributionKey = (typeof FLAT_ATTRIBUTION_KEYS)[number]
export type FlatAttribution = Record<FlatAttributionKey, string | null>

export interface AnalyticsProduct {
  product_id: string | null
  sku: string | null
  name: string | null
  variant: string | null
  price: number | null
  quantity: number
  category: string | null
}

export interface OrderCompletedProperties extends FlatAttribution {
  order_id: string
  display_id: number | null
  value: number | null
  subtotal: number | null
  shipping: number | null
  discount: number | null
  currency: string
  products: AnalyticsProduct[]
  coupon: string | null
  promo_codes: string[]
  payment_method: string | null
  governorate: string | null
  locale: string | null
  is_first_order: boolean | null
  email: string | null
  phone: string | null
}

export interface OrderCompletedExtra {
  is_first_order?: boolean | null
  /** product id -> category (handle), looked up by the loader; items carry no category themselves. */
  categoryByProductId?: Record<string, string | null>
}

/** Major-unit amount rounded to 2 decimals; null when absent or unparsable. */
export function toMajor(value: AnalyticsMoney): number | null {
  if (value === null || value === undefined) return null
  let n: number
  if (typeof value === "number") n = value
  else if (typeof value === "string") n = Number.parseFloat(value)
  else if (typeof value === "object" && typeof value.numeric === "number") n = value.numeric
  else if (typeof value === "object" && typeof value.toJSON === "function") {
    const j = value.toJSON()
    n = typeof j === "number" ? j : Number.parseFloat(String(j))
  } else if (typeof value === "object" && value.value !== undefined && value.value !== null) {
    n = typeof value.value === "number" ? value.value : Number.parseFloat(String(value.value))
  } else return null
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

/** `pp_system_default` is cash on delivery; the ShamCash provider (phase 3) carries "shamcash" in its id. */
export function paymentMethodFromProviderId(providerId: string | null | undefined): string | null {
  if (!providerId) return null
  if (providerId === "pp_system_default") return "cod"
  if (providerId.toLowerCase().includes("shamcash")) return "shamcash"
  return providerId
}

export function orderPaymentProviderId(order: AnalyticsOrder): string | null {
  for (const pc of order.payment_collections ?? []) {
    const fromPayment = pc.payments?.find((p) => p.provider_id)?.provider_id
    if (fromPayment) return fromPayment
  }
  for (const pc of order.payment_collections ?? []) {
    const fromSession = pc.payment_sessions?.find((s) => s.provider_id)?.provider_id
    if (fromSession) return fromSession
  }
  return null
}

export function orderPaymentMethod(order: AnalyticsOrder): string | null {
  return paymentMethodFromProviderId(orderPaymentProviderId(order))
}

/** ISO 3166-2 province code as stored on the shipping address (e.g. `sy-di`). */
export function orderGovernorate(order: AnalyticsOrder): string | null {
  const p = order.shipping_address?.province
  return p ? String(p).toLowerCase() : null
}

export function orderPromoCodes(order: AnalyticsOrder): string[] {
  return (order.promotions ?? [])
    .map((p) => p.code)
    .filter((c): c is string => typeof c === "string" && c.length > 0)
}

export function orderEmail(order: AnalyticsOrder): string | null {
  const e = (order.email ?? order.customer?.email ?? "").trim().toLowerCase()
  return e || null
}

export function orderPhone(order: AnalyticsOrder): string | null {
  const addr = order.shipping_address
  return toE164(addr?.phone ?? order.customer?.phone, addr?.country_code)
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/**
 * The metadata the storefront wrote on the cart, as it reaches the order.
 * Medusa's complete-cart workflow copies cart.metadata onto the order (verified
 * in core-flows), so order.metadata is the source; the linked cart is only a fallback.
 */
export function orderTrackingMetadata(order: AnalyticsOrder): Record<string, unknown> {
  return { ...(asRecord(order.cart?.metadata) ?? {}), ...(asRecord(order.metadata) ?? {}) }
}

/**
 * Attribution per docs/analytics.md: the promo code is the strongest creator
 * signal, the link cookie (written by the storefront into the attribution
 * block) is the fallback. A promotion counts as a creator code when its
 * campaign identifier is `creators` or when it equals the cookie's code.
 * Returns the block that is also stored as order.metadata.attribution.
 */
export function orderAttribution(order: AnalyticsOrder): Attribution | null {
  const stored = asRecord(orderTrackingMetadata(order).attribution) as Attribution | null
  const promos = order.promotions ?? []
  const linkCreator = stored?.creator ? String(stored.creator) : null

  const creatorPromo =
    promos.find(
      (p) => p.code && p.campaign?.campaign_identifier?.toLowerCase() === CREATOR_CAMPAIGN_IDENTIFIER
    ) ?? promos.find((p) => p.code && linkCreator && p.code.toLowerCase() === linkCreator.toLowerCase())

  if (!stored && !creatorPromo) return null

  const attribution: Attribution = { ...(stored ?? {}) }
  if (creatorPromo?.code) {
    attribution.creator = creatorPromo.code
    attribution.creator_source = "promo"
  } else if (linkCreator) {
    attribution.creator = linkCreator
    attribution.creator_source = stored?.creator_source ?? "link"
  }
  return attribution
}

/** The spec's attribution keys, flat, every key present (null when unknown). */
export function flattenAttribution(attribution: Attribution | null): FlatAttribution {
  const flat = {} as FlatAttribution
  for (const key of FLAT_ATTRIBUTION_KEYS) {
    const v = attribution?.[key]
    flat[key] = typeof v === "string" && v.length > 0 ? v : null
  }
  return flat
}

/** PostHog distinct_id: the browser's id carried on the order metadata, else the customer, else the email. */
export function resolveDistinctId(order: AnalyticsOrder): string {
  const fromMetadata = orderTrackingMetadata(order).posthog_distinct_id
  if (typeof fromMetadata === "string" && fromMetadata.trim()) return fromMetadata.trim()
  if (order.customer_id) return order.customer_id
  return orderEmail(order) ?? order.id
}

/** Best-effort E.164: keeps `+…`, turns `00…` into `+…`, and maps Syrian local numbers (09xx / 9xx) to +963. */
export function toE164(phone: string | null | undefined, countryCode?: string | null): string | null {
  if (!phone) return null
  let digits = phone.replace(/[^\d+]/g, "")
  if (!digits) return null
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`
  if (digits.startsWith("+")) return digits.length > 4 ? digits : null
  if ((countryCode ?? "sy").toLowerCase() === "sy") {
    if (digits.startsWith("963")) return `+${digits}`
    if (digits.startsWith("0")) digits = digits.slice(1)
    return `+963${digits}`
  }
  return null
}

export function orderToProducts(order: AnalyticsOrder, categoryByProductId: Record<string, string | null> = {}): AnalyticsProduct[] {
  return (order.items ?? []).map((i) => ({
    product_id: i.product_id ?? null,
    sku: i.variant_sku ?? null,
    name: i.product_title ?? i.title ?? null,
    variant: i.variant_title ?? null,
    price: toMajor(i.unit_price),
    quantity: Number(i.quantity) || 0,
    category: (i.product_id && categoryByProductId[i.product_id]) || null,
  }))
}

/** `Order Completed` properties (docs/analytics.md "Server" events). */
export function orderToEventProperties(order: AnalyticsOrder, extra: OrderCompletedExtra = {}): OrderCompletedProperties {
  const promoCodes = orderPromoCodes(order)
  return {
    order_id: order.id,
    display_id: order.display_id ?? null,
    value: toMajor(order.total),
    // Segment-style subtotal (items only); Medusa's own `subtotal` already includes shipping.
    subtotal: toMajor(order.item_subtotal ?? order.subtotal),
    shipping: toMajor(order.shipping_total),
    discount: toMajor(order.discount_total),
    currency: order.currency_code.toLowerCase(),
    products: orderToProducts(order, extra.categoryByProductId),
    coupon: promoCodes[0] ?? null,
    promo_codes: promoCodes,
    payment_method: orderPaymentMethod(order),
    governorate: orderGovernorate(order),
    locale: order.locale ?? null,
    is_first_order: extra.is_first_order ?? null,
    email: orderEmail(order),
    phone: orderPhone(order),
    ...flattenAttribution(orderAttribution(order)),
  }
}

/** Person properties for identify / `$set` (docs/analytics.md "Identity"). */
export function orderToPersonProperties(
  order: AnalyticsOrder,
  extra: { orders_count?: number | null } = {}
): Record<string, unknown> {
  const addr = order.shipping_address
  const placedAt = order.created_at instanceof Date ? order.created_at.toISOString() : (order.created_at ?? null)
  const props: Record<string, unknown> = {
    email: orderEmail(order),
    phone: orderPhone(order),
    first_name: addr?.first_name ?? order.customer?.first_name ?? null,
    last_name: addr?.last_name ?? order.customer?.last_name ?? null,
    governorate: orderGovernorate(order),
    locale: order.locale ?? null,
    last_order_at: placedAt,
  }
  if (order.customer_id) props.customer_id = order.customer_id
  if (typeof extra.orders_count === "number") props.orders_count = extra.orders_count
  return props
}

/** Shared shape of the money events that follow `Order Completed`. */
export function orderLifecycleProperties(order: AnalyticsOrder) {
  return {
    order_id: order.id,
    display_id: order.display_id ?? null,
    value: toMajor(order.total),
    currency: order.currency_code.toLowerCase(),
    payment_method: orderPaymentMethod(order),
    governorate: orderGovernorate(order),
  }
}

export function orderCanceledProperties(order: AnalyticsOrder) {
  const reason = asRecord(order.metadata)?.cancel_reason
  return { ...orderLifecycleProperties(order), reason: typeof reason === "string" ? reason : null }
}

export function orderDeliveredProperties(order: AnalyticsOrder, fulfillmentId?: string | null) {
  return { ...orderLifecycleProperties(order), fulfillment_id: fulfillmentId ?? null }
}

/**
 * `Order Refused` (docs/analytics.md): a cash order the buyer refused at the
 * door is not a sale, so ad platforms get a correction. Nothing emits it yet:
 * the phase-2 ops screen (courier settlement) will call
 * `analytics.track({ event: ANALYTICS_EVENTS.ORDER_REFUSED, actor_id: resolveDistinctId(order),
 * properties: orderRefusedProperties(order, reason) })` when staff mark it.
 */
export function orderRefusedProperties(order: AnalyticsOrder, reason?: string | null) {
  return { ...orderLifecycleProperties(order), reason: reason ?? null }
}

export function paymentCapturedProperties(
  order: AnalyticsOrder,
  payment: { id?: string; amount?: AnalyticsMoney; currency_code?: string | null; provider_id?: string | null }
) {
  return {
    order_id: order.id,
    display_id: order.display_id ?? null,
    value: toMajor(payment.amount) ?? toMajor(order.total),
    currency: (payment.currency_code ?? order.currency_code).toLowerCase(),
    payment_method: paymentMethodFromProviderId(payment.provider_id) ?? orderPaymentMethod(order),
    payment_id: payment.id ?? null,
  }
}
