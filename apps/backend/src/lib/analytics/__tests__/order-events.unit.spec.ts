/**
 * Unit test of the pure order -> PostHog mapping against an order shaped like
 * what `query.graph` returns for ORDER_ANALYTICS_FIELDS (saved from the dev
 * database: order #3, total 552 USD, COD, Damascus). Run: npm run test:unit
 */
import { BigNumber } from "@medusajs/framework/utils"
import {
  ANALYTICS_EVENTS,
  orderAttribution,
  orderToEventProperties,
  orderToPersonProperties,
  paymentMethodFromProviderId,
  resolveDistinctId,
  toE164,
  toMajor,
  type AnalyticsOrder,
} from "../order-events"
import savedOrder from "./fixtures/order-552-usd.json"

const base = savedOrder as unknown as AnalyticsOrder

describe("orderToEventProperties (Order Completed)", () => {
  it("maps a COD order to the spec in major units with flat attribution", () => {
    const props = orderToEventProperties(base, {
      is_first_order: false,
      categoryByProductId: { prod_01: "laptops" },
    })
    expect(props).toEqual({
      order_id: "order_01M5D567BRXZWX5NJ8T2CCNE0X",
      display_id: 3,
      value: 552,
      subtotal: 549,
      shipping: 3,
      discount: 0,
      currency: "usd",
      products: [
        {
          product_id: "prod_01",
          sku: "LAP-IDEA3-15",
          name: "Lenovo IdeaPad Slim 3",
          variant: "8 GB / 512 GB",
          price: 549,
          quantity: 1,
          category: "laptops",
        },
      ],
      coupon: null,
      promo_codes: [],
      payment_method: "cod",
      governorate: "sy-di",
      locale: "ar-SA",
      is_first_order: false,
      email: "test-order@example.com",
      phone: "+963944123456",
      gclid: null,
      fbclid: "IwAR0abc",
      ttclid: null,
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "launch",
      utm_content: null,
      utm_term: null,
      creator: "sara",
      creator_source: "link",
      landing_path: "/ar/l/laptops",
      referrer: "https://l.instagram.com/",
    })
    expect(ANALYTICS_EVENTS.ORDER_COMPLETED).toBe("Order Completed")
  })

  it("prefers the promo code over the link cookie for the creator, and fills coupon", () => {
    const order: AnalyticsOrder = {
      ...base,
      promotions: [{ id: "promo_1", code: "SARA10", campaign: { campaign_identifier: "creators" } }],
    }
    expect(orderAttribution(order)).toMatchObject({ creator: "SARA10", creator_source: "promo" })
    const props = orderToEventProperties(order)
    expect(props).toMatchObject({ coupon: "SARA10", promo_codes: ["SARA10"], creator: "SARA10", creator_source: "promo" })
  })

  it("treats a promo equal to the cookie creator as a creator promo even without a campaign", () => {
    const order: AnalyticsOrder = { ...base, promotions: [{ id: "promo_2", code: "sara" }] }
    expect(orderAttribution(order)).toMatchObject({ creator: "sara", creator_source: "promo" })
  })

  it("keeps a non-creator promo as coupon without inventing a creator", () => {
    const order: AnalyticsOrder = { ...base, metadata: {}, cart: null, promotions: [{ id: "promo_3", code: "EID20" }] }
    const props = orderToEventProperties(order)
    expect(props).toMatchObject({ coupon: "EID20", creator: null, creator_source: null, gclid: null })
    expect(orderAttribution(order)).toBeNull()
  })

  it("has no category when the loader found none", () => {
    expect(orderToEventProperties(base).products[0].category).toBeNull()
  })
})

describe("resolveDistinctId", () => {
  it("uses the browser id carried on the order metadata", () => {
    expect(resolveDistinctId(base)).toBe("0199f0a1-browser-id")
  })
  it("falls back to the cart metadata, then customer id, then email", () => {
    const noOrderMeta: AnalyticsOrder = { ...base, metadata: {} }
    expect(resolveDistinctId(noOrderMeta)).toBe("cart-browser-id")
    const noCart: AnalyticsOrder = { ...noOrderMeta, cart: null }
    expect(resolveDistinctId(noCart)).toBe("cus_01M5D54WBX1WBV2ZX14S42QMT4")
    const guest: AnalyticsOrder = { ...noCart, customer_id: null, email: "Buyer@Example.com" }
    expect(resolveDistinctId(guest)).toBe("buyer@example.com")
  })
})

describe("person properties", () => {
  it("normalises the phone to E.164 and lower-cases the email", () => {
    expect(orderToPersonProperties(base, { orders_count: 2 })).toMatchObject({
      email: "test-order@example.com",
      phone: "+963944123456",
      first_name: "اختبار",
      governorate: "sy-di",
      locale: "ar-SA",
      orders_count: 2,
    })
  })
  it("handles Syrian local numbers", () => {
    expect(toE164("0944 123 456", "sy")).toBe("+963944123456")
    expect(toE164("944123456", "sy")).toBe("+963944123456")
    expect(toE164("00963944123456", "sy")).toBe("+963944123456")
    expect(toE164("+963 944-123-456", "sy")).toBe("+963944123456")
    expect(toE164("", "sy")).toBeNull()
  })
})

describe("money and payment helpers", () => {
  it("keeps major units and accepts raw objects and Medusa BigNumber instances", () => {
    expect(toMajor(552)).toBe(552)
    expect(toMajor("552")).toBe(552)
    expect(toMajor({ value: "549.005" })).toBe(549.01)
    expect(toMajor(null)).toBeNull()
    // What query.graph / the Order Module hand over in-process (seen on the live order.placed path).
    expect(toMajor(new BigNumber(102))).toBe(102)
    expect(toMajor(new BigNumber("99"))).toBe(99)
  })

  it("maps an order whose amounts are BigNumber instances (in-process shape)", () => {
    const order: AnalyticsOrder = {
      ...base,
      total: new BigNumber(102),
      subtotal: new BigNumber(102),
      item_subtotal: new BigNumber(99),
      shipping_total: new BigNumber(3),
      discount_total: new BigNumber(0),
      items: [{ ...(base.items ?? [])[0], unit_price: new BigNumber(99) }],
    }
    expect(orderToEventProperties(order)).toMatchObject({ value: 102, subtotal: 99, shipping: 3, discount: 0 })
    expect(orderToEventProperties(order).products[0].price).toBe(99)
  })
  it("maps provider ids", () => {
    expect(paymentMethodFromProviderId("pp_system_default")).toBe("cod")
    expect(paymentMethodFromProviderId("pp_shamcash_shamcash")).toBe("shamcash")
    expect(paymentMethodFromProviderId(null)).toBeNull()
  })
})
