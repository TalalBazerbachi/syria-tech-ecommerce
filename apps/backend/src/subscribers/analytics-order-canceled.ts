/**
 * `order.canceled` -> PostHog `Order Cancelled` (docs/analytics.md).
 * `reason` comes from `order.metadata.cancel_reason` when staff set one; Medusa's
 * cancel workflow itself records no reason. Fail-safe: errors are logged, never thrown.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { getLogger, loadOrderForAnalytics, trackSafely } from "../lib/analytics/load-order"
import { ANALYTICS_EVENTS, orderCanceledProperties, resolveDistinctId } from "../lib/analytics/order-events"

export default async function analyticsOrderCanceled({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = getLogger(container)
  try {
    const order = await loadOrderForAnalytics(container, data.id)
    if (!order) {
      logger.warn(`[analytics] Order Cancelled: order ${data.id} not found`)
      return
    }
    await trackSafely(container, {
      track: {
        event: ANALYTICS_EVENTS.ORDER_CANCELLED,
        actor_id: resolveDistinctId(order),
        properties: orderCanceledProperties(order),
      },
    })
    logger.info(`[analytics] Order Cancelled ${order.id} (#${order.display_id})`)
  } catch (e) {
    logger.error(`[analytics] Order Cancelled failed for ${data?.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
