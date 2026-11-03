/**
 * Pure formatting of the staff "new order" alert (Telegram, HTML parse mode).
 * Staff use it to call the customer and confirm a cash-on-delivery order, so it
 * carries everything needed for that call and for dispatch: number, total,
 * payment method, name, phone, governorate, address, landmark, notes, delivery
 * option, items, promo codes and a link to the order in the admin.
 * No I/O here so the text is unit-testable against a saved order.
 */
import { findGovernorate } from "../../data/governorates"
import { paymentMethodFromProviderId, toE164, toMajor, type AnalyticsMoney } from "../analytics/order-events"

export interface AlertOrderItem {
  title?: string | null
  product_title?: string | null
  variant_title?: string | null
  variant_sku?: string | null
  quantity: number | string
  unit_price?: AnalyticsMoney
}

export interface AlertOrder {
  id: string
  display_id?: number | null
  email?: string | null
  currency_code: string
  total?: AnalyticsMoney
  items?: AlertOrderItem[] | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    province?: string | null
    city?: string | null
    address_1?: string | null
    address_2?: string | null
    country_code?: string | null
    metadata?: Record<string, unknown> | null
  } | null
  shipping_methods?: Array<{ name?: string | null; amount?: AnalyticsMoney }> | null
  payment_collections?: Array<{
    payments?: Array<{ provider_id?: string | null }> | null
    payment_sessions?: Array<{ provider_id?: string | null }> | null
  }> | null
  promotions?: Array<{ code?: string | null }> | null
}

export const ORDER_ALERT_FIELDS = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "total",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.province",
  "shipping_address.city",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.country_code",
  "shipping_address.metadata",
  "shipping_methods.name",
  "shipping_methods.amount",
  "payment_collections.payments.provider_id",
  "payment_collections.payment_sessions.provider_id",
  "promotions.code",
]

/** Telegram's limit is 4096 characters; long orders list the first items only. */
const MAX_ITEMS = 25

/** Text for Telegram's HTML parse mode: only &, < and > need escaping. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** `552` + `usd` -> `$552`; whole amounts drop the decimals. */
export function formatMoney(value: AnalyticsMoney, currencyCode: string): string {
  const amount = toMajor(value)
  if (amount === null) return "-"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount} ${currencyCode.toUpperCase()}`
  }
}

function paymentLabel(order: AlertOrder): string | null {
  let providerId: string | null = null
  for (const pc of order.payment_collections ?? []) {
    providerId =
      pc.payments?.find((p) => p.provider_id)?.provider_id ??
      pc.payment_sessions?.find((s) => s.provider_id)?.provider_id ??
      null
    if (providerId) break
  }
  const method = paymentMethodFromProviderId(providerId)
  if (method === "cod") return "الدفع عند الاستلام"
  if (method === "shamcash") return "شام كاش"
  return method
}

function governorateLabel(province: string | null | undefined): string | null {
  if (!province) return null
  const g = findGovernorate(province)
  return g ? g.name_ar : province
}

/**
 * The alert text. `adminUrl` is the public admin base (`https://<store>/app`);
 * without it the message has no link.
 */
export function formatOrderAlert(order: AlertOrder, opts: { adminUrl?: string | null } = {}): string {
  const currency = order.currency_code
  const addr = order.shipping_address ?? {}
  const name = [addr.first_name, addr.last_name].filter(Boolean).join(" ").trim()
  const phone = toE164(addr.phone, addr.country_code) ?? addr.phone ?? null
  const notes = typeof addr.metadata?.notes === "string" ? addr.metadata.notes.trim() : ""
  const place = [governorateLabel(addr.province), addr.city].filter(Boolean).join("، ")
  const payment = paymentLabel(order)
  const shipping = order.shipping_methods?.[0]
  const codes = (order.promotions ?? []).map((p) => p.code).filter((c): c is string => !!c)

  const lines: string[] = []
  lines.push(`🛒 <b>طلب جديد #${escapeHtml(order.display_id ?? order.id)}</b>`)
  lines.push(
    `💰 الإجمالي: <b>${escapeHtml(formatMoney(order.total, currency))}</b>` +
      (payment ? ` (${escapeHtml(payment)})` : "")
  )
  lines.push("")
  if (name) lines.push(`👤 ${escapeHtml(name)}`)
  if (phone) lines.push(`📞 ${escapeHtml(phone)}`)
  if (order.email) lines.push(`✉️ ${escapeHtml(order.email)}`)
  if (place) lines.push(`📍 ${escapeHtml(place)}`)
  if (addr.address_1) lines.push(`🏠 ${escapeHtml(addr.address_1)}`)
  if (addr.address_2) lines.push(`🧭 قرب: ${escapeHtml(addr.address_2)}`)
  if (notes) lines.push(`📝 ${escapeHtml(notes)}`)
  if (shipping?.name) {
    lines.push(`🚚 ${escapeHtml(shipping.name)} (${escapeHtml(formatMoney(shipping.amount, currency))})`)
  }

  const items = order.items ?? []
  if (items.length) {
    lines.push("")
    lines.push("<b>المنتجات:</b>")
    for (const item of items.slice(0, MAX_ITEMS)) {
      const title = item.product_title || item.title || "-"
      const variant = item.variant_title && item.variant_title !== title ? ` (${item.variant_title})` : ""
      const sku = item.variant_sku ? ` [${item.variant_sku}]` : ""
      lines.push(
        `• ${escapeHtml(item.quantity)} × ${escapeHtml(title + variant)}${escapeHtml(sku)} — ` +
          escapeHtml(formatMoney(item.unit_price, currency))
      )
    }
    if (items.length > MAX_ITEMS) lines.push(`… و${items.length - MAX_ITEMS} منتجات أخرى`)
  }

  if (codes.length) {
    lines.push("")
    lines.push(`🏷️ كود الخصم: ${escapeHtml(codes.join(", "))}`)
  }

  const adminUrl = opts.adminUrl?.replace(/\/+$/, "")
  if (adminUrl && /^https?:\/\//.test(adminUrl)) {
    lines.push("")
    lines.push(`<a href="${escapeHtml(`${adminUrl}/orders/${order.id}`)}">فتح الطلب في لوحة التحكم</a>`)
  }

  return lines.join("\n")
}
