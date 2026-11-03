import { sdk } from "@lib/config"
import { placeOrder } from "@lib/data/cart"
import { getAuthHeaders, setCartId } from "@lib/data/cookies"
import { defaultLocale, isAppLocale } from "@i18n/routing"
import { HttpTypes } from "@medusajs/types"
import { unstable_rethrow } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

/**
 * Return URL for redirect-based card payments (not used at launch: the only
 * provider is cash on delivery). Kept from dtc-starter so a card provider can
 * be switched on later without re-plumbing checkout.
 */
export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl

  const cartId = searchParams.get("cart_id")
  const requestedLocale = searchParams.get("locale")
  const locale = isAppLocale(requestedLocale) ? requestedLocale : defaultLocale
  const paymentIntent = searchParams.get("payment_intent")
  const paymentIntentClientSecret = searchParams.get(
    "payment_intent_client_secret"
  )
  const redirectStatus = searchParams.get("redirect_status")

  const prefix = `/${locale}`
  const rejected = () =>
    NextResponse.redirect(`${origin}${prefix}/cart?error=payment_failed`)

  if (!cartId || !paymentIntent || !paymentIntentClientSecret) {
    return rejected()
  }

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "payment_collection.payment_sessions.data" },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  const paymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session) => session.data?.id === paymentIntent
  )

  if (
    !paymentSession ||
    paymentSession.data?.client_secret !== paymentIntentClientSecret
  ) {
    return rejected()
  }

  await setCartId(cartId)

  if (redirectStatus === "failed") {
    const params = new URLSearchParams({ step: "payment" })

    for (const key of [
      "payment_intent",
      "payment_intent_client_secret",
      "redirect_status",
    ]) {
      const value = searchParams.get(key)

      if (value) {
        params.set(key, value)
      }
    }

    return NextResponse.redirect(`${origin}${prefix}/checkout?${params}`)
  }

  try {
    await placeOrder(cartId)
  } catch (error) {
    unstable_rethrow(error)

    return NextResponse.redirect(`${origin}${prefix}/cart?error=order_failed`)
  }

  return NextResponse.redirect(`${origin}${prefix}/cart?error=order_failed`)
}
