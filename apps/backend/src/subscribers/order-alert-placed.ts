/**
 * `order.placed` -> a message in the staff Telegram chat, so someone calls the
 * customer to confirm the cash-on-delivery order. Off unless
 * ORDER_ALERT_TELEGRAM_BOT_TOKEN and ORDER_ALERT_TELEGRAM_CHAT_ID are set.
 * Fail-safe: a Telegram problem is logged, never thrown, so it cannot fail the
 * order. Runs in the worker (MEDUSA_WORKER_MODE=worker), like every subscriber.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { getLogger } from "../lib/analytics/load-order"
import { formatOrderAlert } from "../lib/order-alerts/order-alert"
import { getTelegramAlertConfig, loadOrderForAlert, sendTelegramMessage } from "../lib/order-alerts/telegram"

export default async function orderAlertPlaced({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const config = getTelegramAlertConfig()
  if (!config) return

  const logger = getLogger(container)
  try {
    const order = await loadOrderForAlert(container, data.id)
    if (!order) {
      logger.warn(`[order-alert] order ${data.id} not found`)
      return
    }
    await sendTelegramMessage(config, formatOrderAlert(order, { adminUrl: config.adminUrl }))
    logger.info(`[order-alert] sent for ${order.id} (#${order.display_id})`)
  } catch (e) {
    logger.error(`[order-alert] failed for ${data?.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
