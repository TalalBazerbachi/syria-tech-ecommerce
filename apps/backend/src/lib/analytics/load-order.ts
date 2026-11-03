/**
 * I/O side of the analytics subscribers: load an order with everything the
 * mappers in ./order-events.ts need, count the buyer's orders, persist the
 * tracking metadata on the order, and a fail-safe wrapper around the
 * Analytics Module so a PostHog hiccup never fails a Medusa workflow.
 */
import type { IAnalyticsModuleService, IOrderModuleService, Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { AnalyticsOrder, Attribution } from "./order-events"

export const ORDER_ANALYTICS_FIELDS = [
  "id",
  "display_id",
  "status",
  "email",
  "customer_id",
  "currency_code",
  "locale",
  "metadata",
  "created_at",
  "canceled_at",
  "total",
  "subtotal",
  "item_subtotal",
  "shipping_total",
  "discount_total",
  "tax_total",
  "items.id",
  "items.product_id",
  "items.variant_id",
  "items.variant_sku",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.product_collection",
  "items.product_type",
  "items.quantity",
  "items.unit_price",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.province",
  "shipping_address.city",
  "shipping_address.country_code",
  "customer.id",
  "customer.email",
  "customer.phone",
  "customer.first_name",
  "customer.last_name",
  "payment_collections.id",
  "payment_collections.payments.id",
  "payment_collections.payments.provider_id",
  "payment_collections.payment_sessions.id",
  "payment_collections.payment_sessions.provider_id",
  "promotions.id",
  "promotions.code",
  "promotions.campaign.campaign_identifier",
  "fulfillments.id",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
  "cart.id",
  "cart.metadata",
]

type Query = { graph: (q: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }> }

export function getLogger(container: MedusaContainer): Logger {
  return container.resolve(ContainerRegistrationKeys.LOGGER)
}

export async function loadOrderForAnalytics(container: MedusaContainer, orderId: string): Promise<AnalyticsOrder | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_ANALYTICS_FIELDS,
    filters: { id: orderId },
  })
  // Totals and unit prices come back as BigNumber instances in-process (they only become
  // plain numbers when JSON-serialised); toMajor() in order-events.ts handles both shapes.
  return (data?.[0] as AnalyticsOrder | undefined) ?? null
}

/**
 * product id -> first category handle for the order's items. Order line items
 * carry denormalised product text but no category, so this is one extra read of
 * the Product Module; a missing product (deleted since) just yields no category.
 */
export async function loadProductCategories(
  container: MedusaContainer,
  order: AnalyticsOrder
): Promise<Record<string, string | null>> {
  const ids = Array.from(
    new Set((order.items ?? []).map((i) => i.product_id).filter((id): id is string => typeof id === "string" && id.length > 0))
  )
  if (!ids.length) return {}
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "categories.handle", "categories.name"],
    filters: { id: ids },
  })
  const out: Record<string, string | null> = {}
  for (const p of (data ?? []) as Array<{ id: string; categories?: Array<{ handle?: string | null; name?: string | null }> | null }>) {
    const c = p.categories?.[0]
    out[p.id] = c?.handle ?? c?.name ?? null
  }
  return out
}

/** Order id behind a fulfillment (order_fulfillment link), or null. */
export async function orderIdForFulfillment(container: MedusaContainer, fulfillmentId: string): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query
  const { data } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "order.id"],
    filters: { id: fulfillmentId },
  })
  const f = data?.[0] as { order?: { id?: string } | null } | undefined
  return f?.order?.id ?? null
}

export interface PaymentForAnalytics {
  id: string
  amount?: number | string | null
  currency_code?: string | null
  provider_id?: string | null
  captured_at?: string | Date | null
  payment_collection_id?: string | null
}

/** The captured payment plus the order it belongs to (payment -> payment_collection -> order link). */
export async function loadPaymentWithOrderId(
  container: MedusaContainer,
  paymentId: string
): Promise<{ payment: PaymentForAnalytics; orderId: string | null } | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query
  const { data } = await query.graph({
    entity: "payment",
    fields: ["id", "amount", "currency_code", "provider_id", "captured_at", "payment_collection_id"],
    filters: { id: paymentId },
  })
  const payment = data?.[0] as PaymentForAnalytics | undefined
  if (!payment) return null
  if (!payment.payment_collection_id) return { payment, orderId: null }
  const { data: pcs } = await query.graph({
    entity: "payment_collection",
    fields: ["id", "order.id"],
    filters: { id: payment.payment_collection_id },
  })
  const pc = pcs?.[0] as { order?: { id?: string } | null } | undefined
  return { payment, orderId: pc?.order?.id ?? null }
}

/**
 * How many (non-draft) orders this buyer has, including the current one, so
 * `is_first_order` = count <= 1 and `orders_count` = count. Guests get a
 * customer id per email in Medusa, so customer_id covers them too; email is
 * the fallback for the rare order without one.
 */
export async function countBuyerOrders(container: MedusaContainer, order: AnalyticsOrder): Promise<number | null> {
  const filters: Record<string, unknown> = { is_draft_order: false }
  if (order.customer_id) filters.customer_id = order.customer_id
  else if (order.email) filters.email = order.email
  else return null
  const orderModule: IOrderModuleService = container.resolve(Modules.ORDER)
  const [, count] = await orderModule.listAndCountOrders(filters, { select: ["id"], take: 1 })
  return count
}

/**
 * Make sure what the storefront wrote on the cart is on the order too
 * (posthog_distinct_id, attribution), and store the finalized attribution so
 * staff see it in the admin and creator settlements can be exported.
 * Medusa copies cart.metadata to order.metadata on completion; this is the
 * safety net plus the enrichment. Returns the metadata written, or null.
 */
export async function persistTrackingMetadata(
  container: MedusaContainer,
  order: AnalyticsOrder,
  attribution: Attribution | null,
  distinctId: string
): Promise<Record<string, unknown> | null> {
  const current = (order.metadata ?? {}) as Record<string, unknown>
  const next: Record<string, unknown> = { ...current }
  const cartMeta = (order.cart?.metadata ?? {}) as Record<string, unknown>

  if (!next.posthog_distinct_id && typeof cartMeta.posthog_distinct_id === "string") {
    next.posthog_distinct_id = cartMeta.posthog_distinct_id
  }
  if (!next.posthog_distinct_id && distinctId && distinctId !== order.id) {
    next.posthog_distinct_id = distinctId
  }
  if (attribution) next.attribution = attribution

  if (JSON.stringify(next) === JSON.stringify(current)) return null
  const orderModule: IOrderModuleService = container.resolve(Modules.ORDER)
  await orderModule.updateOrders([{ id: order.id, metadata: next }])
  return next
}

/**
 * Fail-safe analytics: resolves the module and calls track/identify; errors
 * are logged with the event name and never thrown. A missing Analytics Module
 * (not registered) is logged once per process at warn level.
 */
let warnedNoModule = false
export async function trackSafely(
  container: MedusaContainer,
  calls: {
    track?: { event: string; actor_id: string; properties: Record<string, unknown> }
    identify?: { actor_id: string; properties: Record<string, unknown> }
  }
): Promise<boolean> {
  const logger = getLogger(container)
  let analytics: IAnalyticsModuleService
  try {
    analytics = container.resolve(Modules.ANALYTICS)
  } catch {
    if (!warnedNoModule) {
      logger.warn("[analytics] Analytics Module is not registered; events are dropped")
      warnedNoModule = true
    }
    return false
  }
  let ok = true
  if (calls.track) {
    try {
      await analytics.track(calls.track)
    } catch (e) {
      ok = false
      logger.error(`[analytics] track ${calls.track.event} failed: ${(e as Error).message}`)
    }
  }
  if (calls.identify) {
    try {
      await analytics.identify(calls.identify)
    } catch (e) {
      ok = false
      logger.error(`[analytics] identify ${calls.identify.actor_id} failed: ${(e as Error).message}`)
    }
  }
  return ok
}
