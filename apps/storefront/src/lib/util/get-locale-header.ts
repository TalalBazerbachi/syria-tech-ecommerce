import { getMedusaLocale } from "@lib/data/locale-actions"
import { toMedusaLocale } from "@i18n/routing"

/**
 * `x-medusa-locale` for the current request.
 *
 * In the browser the locale is read from `<html lang>` (set per locale by the
 * root layout) so client-side calls (search, option filters) don't round-trip
 * to a server action. On the server it comes from next-intl's request locale.
 */
export async function getLocaleHeader(): Promise<{ "x-medusa-locale": string }> {
  if (typeof window !== "undefined") {
    return {
      "x-medusa-locale": toMedusaLocale(document.documentElement.lang),
    }
  }

  return { "x-medusa-locale": await getMedusaLocale() }
}
