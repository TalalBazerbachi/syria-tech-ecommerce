import { CartAnalyticsSync } from "@lib/analytics/cart-sync"
import { cartSnapshot } from "@lib/analytics/track"
import { TrackCheckoutStarted } from "@lib/analytics/trackers"
import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout")
  return {
    title: t("title"),
  }
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <TrackCheckoutStarted cart={cartSnapshot(cart)} />
      {/* The order copies cart metadata: make sure distinct id + attribution are on it before it is placed. */}
      <CartAnalyticsSync
        cartId={cart.id}
        attached={typeof cart.metadata?.posthog_distinct_id === "string"}
      />
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
