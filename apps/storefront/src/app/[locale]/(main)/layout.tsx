import { Metadata } from "next"

import { CartAnalyticsSync } from "@lib/analytics/cart-sync"
import { CustomerIdentity } from "@lib/analytics/identity"
import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getBaseURL } from "@lib/util/env"
import { StoreCartShippingOption } from "@medusajs/types"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const customer = await retrieveCustomer()
  const cart = await retrieveCart()
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()

    shippingOptions = shipping_options
  }

  return (
    <>
      <Nav />
      {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}

      {cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      {props.children}
      <Footer />
      {/* Analytics identity: posthog.identify for signed-in customers, distinct id + attribution onto the cart. */}
      <CustomerIdentity
        customer={
          customer
            ? {
                id: customer.id,
                email: customer.email ?? null,
                first_name: customer.first_name ?? null,
                last_name: customer.last_name ?? null,
              }
            : null
        }
      />
      <CartAnalyticsSync
        cartId={cart?.id ?? null}
        attached={typeof cart?.metadata?.posthog_distinct_id === "string"}
      />
    </>
  )
}
