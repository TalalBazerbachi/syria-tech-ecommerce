/**
 * Unit test of the staff order alert text and the Telegram call, against the
 * saved COD order used by the analytics tests (order #3, 552 USD, Damascus).
 * Run: npm run test:unit
 */
import { BigNumber } from "@medusajs/framework/utils"
import savedOrder from "../../analytics/__tests__/fixtures/order-552-usd.json"
import { escapeHtml, formatMoney, formatOrderAlert, type AlertOrder } from "../order-alert"
import { getTelegramAlertConfig, sendTelegramMessage } from "../telegram"

const order: AlertOrder = {
  ...(savedOrder as unknown as AlertOrder),
  shipping_address: {
    ...(savedOrder.shipping_address as AlertOrder["shipping_address"]),
    city: "المزة",
    address_1: "شارع الجلاء، بناء 4، طابق 2",
    address_2: "جانب جامع <الأكرم>",
    metadata: { notes: "الاتصال قبل الوصول" },
  },
  shipping_methods: [{ name: "Damascus courier (COD)", amount: 3 }],
}

describe("formatOrderAlert", () => {
  const text = formatOrderAlert(order, { adminUrl: "https://shop.example.com/app/" })

  it("has what staff need to confirm and dispatch the order", () => {
    expect(text).toContain("طلب جديد #3")
    expect(text).toContain("$552")
    expect(text).toContain("الدفع عند الاستلام")
    expect(text).toContain("اختبار المشتري")
    expect(text).toContain("+963944123456")
    expect(text).toContain("test-order@example.com")
    expect(text).toContain("دمشق، المزة")
    expect(text).toContain("شارع الجلاء، بناء 4، طابق 2")
    expect(text).toContain("الاتصال قبل الوصول")
    expect(text).toContain("Damascus courier (COD) ($3)")
    expect(text).toContain("• 1 × Lenovo IdeaPad Slim 3 (8 GB / 512 GB) [LAP-IDEA3-15] — $549")
  })

  it("escapes customer text and links to the order in the admin", () => {
    expect(text).toContain("جانب جامع &lt;الأكرم&gt;")
    expect(text).toContain(
      '<a href="https://shop.example.com/app/orders/order_01M5D567BRXZWX5NJ8T2CCNE0X">'
    )
  })

  it("leaves out what the order does not have", () => {
    const bare = formatOrderAlert({ id: "order_x", currency_code: "usd", total: 10 })
    expect(bare).toBe("🛒 <b>طلب جديد #order_x</b>\n💰 الإجمالي: <b>$10</b>\n")
  })

  it("lists at most 25 items", () => {
    const many = formatOrderAlert({
      ...order,
      items: Array.from({ length: 30 }, (_, i) => ({ title: `Item ${i}`, quantity: 1, unit_price: 1 })),
    })
    expect(many.match(/^• /gm)).toHaveLength(25)
    expect(many).toContain("… و5 منتجات أخرى")
  })
})

describe("formatMoney / escapeHtml", () => {
  it("formats major units in the order currency", () => {
    expect(formatMoney(552, "usd")).toBe("$552")
    expect(formatMoney(new BigNumber(549.5), "usd")).toBe("$549.5")
    expect(formatMoney(null, "usd")).toBe("-")
  })

  it("escapes the three HTML characters Telegram cares about", () => {
    expect(escapeHtml("a & <b>")).toBe("a &amp; &lt;b&gt;")
  })
})

describe("getTelegramAlertConfig", () => {
  it("is off unless both the token and the chat id are set", () => {
    expect(getTelegramAlertConfig({})).toBeNull()
    expect(getTelegramAlertConfig({ ORDER_ALERT_TELEGRAM_BOT_TOKEN: "t" })).toBeNull()
    expect(
      getTelegramAlertConfig({
        ORDER_ALERT_TELEGRAM_BOT_TOKEN: " t ",
        ORDER_ALERT_TELEGRAM_CHAT_ID: "-100",
        MEDUSA_ADMIN_PUBLIC_URL: "https://shop.example.com/app",
      })
    ).toEqual({ botToken: "t", chatId: "-100", adminUrl: "https://shop.example.com/app" })
  })
})

describe("sendTelegramMessage", () => {
  it("posts HTML text to the chat", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200 })
    await sendTelegramMessage({ botToken: "123:abc", chatId: "-100" }, "<b>hi</b>", fetchImpl as unknown as typeof fetch)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage")
    expect(JSON.parse(init.body)).toEqual({
      chat_id: "-100",
      text: "<b>hi</b>",
      parse_mode: "HTML",
      disable_web_page_preview: true,
    })
  })

  it("throws with Telegram's description on an error answer", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ ok: false, description: "Forbidden: bot is not a member of the group chat" }),
    })
    await expect(
      sendTelegramMessage({ botToken: "t", chatId: "-1" }, "x", fetchImpl as unknown as typeof fetch)
    ).rejects.toThrow("Telegram sendMessage answered 403: Forbidden: bot is not a member of the group chat")
  })
})
