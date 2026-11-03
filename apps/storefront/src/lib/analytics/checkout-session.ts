/**
 * The cart id survives order placement only here: `placeOrder` clears the
 * `_medusa_cart_id` cookie and `/store/orders/:id` does not expose the cart,
 * so the review step stashes it and the confirmation page reads it back for
 * the `checkout_completed` hint.
 */

const KEY = "st_checkout_cart_id"

export function rememberCheckoutCartId(cartId: string) {
  try {
    window.sessionStorage.setItem(KEY, cartId)
  } catch {
    // Without sessionStorage the hint simply has no cart_id.
  }
}

export function consumeCheckoutCartId(): string | null {
  try {
    const value = window.sessionStorage.getItem(KEY)
    if (value) {
      window.sessionStorage.removeItem(KEY)
    }
    return value
  } catch {
    return null
  }
}
