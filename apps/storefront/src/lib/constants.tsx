import { CreditCard } from "@medusajs/icons"
import Cash from "@modules/common/icons/cash"
import React from "react"

export type PaymentInfo = {
  /** Key under `checkout.methods` in the message catalogs. */
  key: "cod" | "card"
  /** Whether a short explanation (`checkout.methods.<key>Description`) exists. */
  hasDescription: boolean
  icon: React.JSX.Element
}

/**
 * Payment providers the storefront knows how to label. At launch the only
 * enabled provider is Medusa's built-in manual provider, which this store
 * presents as cash on delivery. Unknown provider ids fall back to their raw
 * id so a newly enabled provider is never hidden.
 */
export const paymentInfoMap: Record<string, PaymentInfo> = {
  pp_system_default: {
    key: "cod",
    hasDescription: true,
    icon: <Cash />,
  },
  pp_stripe_stripe: {
    key: "card",
    hasDescription: false,
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    key: "card",
    hasDescription: false,
    icon: <CreditCard />,
  },
}

export const getPaymentInfo = (providerId?: string): PaymentInfo | undefined =>
  providerId ? paymentInfoMap[providerId] : undefined

// Card providers that mount a Stripe Payment Element (native Stripe or Medusa Payments).
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

/** Medusa's manual provider: no online payment step, the courier collects cash. */
export const isCashOnDelivery = (providerId?: string) => {
  return providerId === "pp_system_default"
}

/** @deprecated use `isCashOnDelivery` — kept so dtc-starter call sites read the same. */
export const isManual = isCashOnDelivery
