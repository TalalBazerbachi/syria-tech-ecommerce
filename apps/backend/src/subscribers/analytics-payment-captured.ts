/**
 * `payment.captured` -> PostHog `Payment Captured` (docs/analytics.md): cash counted after
 * the courier remits it (admin "Capture payment"), or a wallet confirmation later.
 * Event data is `{ id: <payment id> }`; the order is found through the payment collection link.
 * Fail-safe: errors are logged, never thrown.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { getLogger, loadOrderForAnalytics, loadPaymentWithOrderId, trackSafely } from "../lib/analytics/load-order"
import { ANALYTICS_EVENTS, paymentCapturedProperties, resolveDistinctId } from "../lib/analytics/order-events"

export default async function analyticsPaymentCaptured({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = getLogger(container)
  try {
    const loaded = await loadPaymentWithOrderId(container, data.id)
    if (!loaded) {
      logger.warn(`[analytics] Payment Captured: payment ${data.id} not found`)
      return
    }
    if (!loaded.orderId) {
      logger.debug(`[analytics] Payment Captured: payment ${data.id} belongs to no order`)
      return
    }
    const order = await loadOrderForAnalytics(container, loaded.orderId)
    if (!order) {
      logger.warn(`[analytics] Payment Captured: order ${loaded.orderId} not found`)
      return
    }
    await trackSafely(container, {
      track: {
        event: ANALYTICS_EVENTS.PAYMENT_CAPTURED,
        actor_id: resolveDistinctId(order),
        properties: paymentCapturedProperties(order, loaded.payment),
      },
    })
    logger.info(`[analytics] Payment Captured ${order.id} (#${order.display_id}) payment=${data.id}`)
  } catch (e) {
    logger.error(`[analytics] Payment Captured failed for payment ${data?.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
