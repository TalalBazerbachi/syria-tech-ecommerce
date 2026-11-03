"use server"

import { sdk } from "@lib/config"
import { defaultLocale, isAppLocale, toMedusaLocale, type AppLocale } from "@i18n/routing"
import { revalidateTag } from "next/cache"
import { getLocale as getRequestLocale } from "next-intl/server"
import { getAuthHeaders, getCacheTag, getCartId } from "./cookies"

/** The UI locale (`ar` | `en`) of the current request, from the URL segment. */
export async function getAppLocale(): Promise<AppLocale> {
  try {
    const locale = await getRequestLocale()
    return isAppLocale(locale) ? locale : defaultLocale
  } catch {
    return defaultLocale
  }
}

/** The Medusa locale code (`ar-SA` | `en`) for the current request. */
export async function getMedusaLocale(): Promise<string> {
  return toMedusaLocale(await getAppLocale())
}

/**
 * Called by the language switcher before navigating to the other locale:
 * keeps the open cart's `locale` in step so the backend (emails, admin) sees
 * the language the customer actually shops in.
 */
export async function updateCartLocale(locale: AppLocale): Promise<void> {
  const cartId = await getCartId()
  if (!cartId) {
    return
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.cart.update(
      cartId,
      { locale: toMedusaLocale(locale) },
      {},
      headers
    )
  } catch {
    // A stale cart id must not block switching language.
    return
  }

  const cartCacheTag = await getCacheTag("carts")
  if (cartCacheTag) {
    revalidateTag(cartCacheTag)
  }
}
