/**
 * I/O side of the staff order alerts: read the Telegram config from the
 * environment, load an order with ORDER_ALERT_FIELDS, and post a message
 * through the Bot API. Callers log failures; nothing here retries.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_ALERT_FIELDS, type AlertOrder } from "./order-alert"

export interface TelegramAlertConfig {
  botToken: string
  chatId: string
  /** Public admin base, e.g. https://shop.example.com/app */
  adminUrl: string | null
}

/** Null when either the bot token or the chat id is missing: alerts are off. */
export function getTelegramAlertConfig(env: NodeJS.ProcessEnv = process.env): TelegramAlertConfig | null {
  const botToken = env.ORDER_ALERT_TELEGRAM_BOT_TOKEN?.trim()
  const chatId = env.ORDER_ALERT_TELEGRAM_CHAT_ID?.trim()
  if (!botToken || !chatId) return null
  return { botToken, chatId, adminUrl: env.MEDUSA_ADMIN_PUBLIC_URL?.trim() || null }
}

type Query = { graph: (q: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }> }

export async function loadOrderForAlert(container: MedusaContainer, orderId: string): Promise<AlertOrder | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query
  const { data } = await query.graph({ entity: "order", fields: ORDER_ALERT_FIELDS, filters: { id: orderId } })
  return (data?.[0] as AlertOrder | undefined) ?? null
}

/** Posts `text` (HTML parse mode) to the configured chat; throws on a non-OK answer. */
export async function sendTelegramMessage(
  config: Pick<TelegramAlertConfig, "botToken" | "chatId">,
  text: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const res = await fetchImpl(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    // Telegram explains itself in `description` (bad token, bot not in the chat, ...).
    let detail = ""
    try {
      const body = (await res.json()) as { description?: string }
      detail = body?.description ? `: ${body.description}` : ""
    } catch {
      // not JSON
    }
    throw new Error(`Telegram sendMessage answered ${res.status}${detail}`)
  }
}
