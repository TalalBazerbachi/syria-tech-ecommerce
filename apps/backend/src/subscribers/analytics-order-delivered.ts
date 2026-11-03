/**
 * Fulfillment marked delivered -> PostHog `Order Delivered` (docs/analytics.md).
 *
 * In Medusa 2.21 the admin's "Mark as delivered" runs markOrderFulfillmentAsDeliveredWorkflow,
 * which emits `delivery.created` with `{ id: <fulfillment id> }` (FulfillmentWorkflowEvents.DELIVERY_CREATED).
 * One order can have several fulfillments; `Order Delivered` is sent once, when the last
 * open fulfillment is delivered. Fail-safe: errors are logged, never thrown.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { getLogger, loadOrderForAnalytics, orderIdForFulfillment, trackSafely } from "../lib/analytics/load-order"
import { ANALYTICS_EVENTS, orderDeliveredProperties, resolveDistinctId } from "../lib/analytics/order-events"

export default async function analyticsOrderDelivered({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = getLogger(container)
  try {
    const orderId = await orderIdForFulfillment(container, data.id)
    if (!orderId) {
      // Fulfillments of returns/exchanges are not linked as order fulfillments; nothing to report.
      logger.debug(`[analytics] Order Delivered: fulfillment ${data.id} has no order link`)
      return
    }
    const order = await loadOrderForAnalytics(container, orderId)
    if (!order) {
      logger.warn(`[analytics] Order Delivered: order ${orderId} not found`)
      return
    }
    const open = (order.fulfillments ?? []).filter((f) => !f.canceled_at)
    const allDelivered = open.length > 0 && open.every((f) => Boolean(f.delivered_at))
    if (!allDelivered) {
      logger.info(`[analytics] Order Delivered: ${order.id} still has undelivered fulfillments; waiting`)
      return
    }
    await trackSafely(container, {
      track: {
        event: ANALYTICS_EVENTS.ORDER_DELIVERED,
        actor_id: resolveDistinctId(order),
        properties: orderDeliveredProperties(order, data.id),
      },
    })
    logger.info(`[analytics] Order Delivered ${order.id} (#${order.display_id})`)
  } catch (e) {
    logger.error(`[analytics] Order Delivered failed for fulfillment ${data?.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
