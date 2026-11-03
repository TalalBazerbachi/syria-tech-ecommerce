/**
 * `order.placed` -> PostHog `Order Completed` (docs/analytics.md, "Server" events).
 * The one source of truth for a sale; the storefront only sends a hint.
 * Fail-safe: analytics problems are logged, never thrown.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  countBuyerOrders,
  getLogger,
  loadOrderForAnalytics,
  loadProductCategories,
  persistTrackingMetadata,
  trackSafely,
} from "../lib/analytics/load-order"
import {
  ANALYTICS_EVENTS,
  orderAttribution,
  orderToEventProperties,
  orderToPersonProperties,
  resolveDistinctId,
} from "../lib/analytics/order-events"

export default async function analyticsOrderPlaced({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = getLogger(container)
  try {
    const order = await loadOrderForAnalytics(container, data.id)
    if (!order) {
      logger.warn(`[analytics] Order Completed: order ${data.id} not found`)
      return
    }

    let ordersCount: number | null = null
    try {
      ordersCount = await countBuyerOrders(container, order)
    } catch (e) {
      logger.warn(`[analytics] Order Completed: could not count orders for ${order.id}: ${(e as Error).message}`)
    }

    let categoryByProductId: Record<string, string | null> = {}
    try {
      categoryByProductId = await loadProductCategories(container, order)
    } catch (e) {
      logger.warn(`[analytics] Order Completed: could not load categories for ${order.id}: ${(e as Error).message}`)
    }

    const distinctId = resolveDistinctId(order)
    const isFirstOrder = ordersCount === null ? null : ordersCount <= 1
    const properties = orderToEventProperties(order, { is_first_order: isFirstOrder, categoryByProductId })
    const person = orderToPersonProperties(order, { orders_count: ordersCount })
    const placedAt = person.last_order_at
    const attribution = orderAttribution(order)

    try {
      await persistTrackingMetadata(container, order, attribution, distinctId)
    } catch (e) {
      logger.warn(`[analytics] Order Completed: could not persist metadata on ${order.id}: ${(e as Error).message}`)
    }

    const setOnce: Record<string, unknown> = { first_order_at: placedAt }
    if (properties.creator) setOnce.first_creator = properties.creator

    await trackSafely(container, {
      track: {
        event: ANALYTICS_EVENTS.ORDER_COMPLETED,
        actor_id: distinctId,
        properties: { ...properties, $set: person, $set_once: setOnce },
      },
      identify: {
        actor_id: distinctId,
        properties: isFirstOrder ? { ...person, first_order_at: placedAt } : person,
      },
    })
    logger.info(`[analytics] Order Completed ${order.id} (#${order.display_id}) distinct_id=${distinctId}`)
  } catch (e) {
    logger.error(`[analytics] Order Completed failed for ${data?.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
