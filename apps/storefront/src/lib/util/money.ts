import { toIntlLocale } from "@i18n/routing"

type FormatMoneyOptions = {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * The only place prices are turned into text. Currency symbols, decimal
 * digits (SYP has none, USD has two) and digit shapes all come from
 * `Intl.NumberFormat`, driven by the region/cart `currency_code` and the UI
 * locale — never from a hard-coded symbol.
 *
 * Medusa v2 amounts are already in major units (229 = 229.00 USD).
 */
export function formatMoney(
  amount: number,
  currencyCode: string,
  locale: string,
  options: FormatMoneyOptions = {}
): string {
  if (!currencyCode) {
    return String(amount)
  }

  try {
    return new Intl.NumberFormat(toIntlLocale(locale), {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      ...options,
    }).format(amount)
  } catch {
    // An unknown currency code must not take a page down.
    return `${amount} ${currencyCode.toUpperCase()}`
  }
}
