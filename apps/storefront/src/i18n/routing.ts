import { defineRouting } from "next-intl/routing"

export const locales = ["ar", "en"] as const
export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale =
  (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as AppLocale | undefined) &&
  locales.includes(process.env.NEXT_PUBLIC_DEFAULT_LOCALE as AppLocale)
    ? (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as AppLocale)
    : "ar"

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every URL carries its locale (`/ar/...`, `/en/...`); `/` redirects to the
  // default locale. Keeps canonical URLs unambiguous for SEO and caching.
  localePrefix: "always",
  localeDetection: false,
})

/** Medusa has no plain `ar`; `ar-SA` stands in for Syrian Arabic (see spike report). */
export const MEDUSA_LOCALES: Record<AppLocale, string> = {
  ar: "ar-SA",
  en: "en",
}

/**
 * The BCP 47 tag handed to `Intl.*`. Arabic uses Latin digits (`nu-latn`):
 * Western digits are what Syrian shops and price tags use.
 */
export const INTL_LOCALES: Record<AppLocale, string> = {
  ar: "ar-SY-u-nu-latn",
  en: "en-US",
}

export const LOCALE_DIRECTION: Record<AppLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
}

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}

export function toMedusaLocale(locale: string | null | undefined): string {
  return isAppLocale(locale) ? MEDUSA_LOCALES[locale] : MEDUSA_LOCALES[defaultLocale]
}

export function toIntlLocale(locale: string | null | undefined): string {
  return isAppLocale(locale) ? INTL_LOCALES[locale] : INTL_LOCALES[defaultLocale]
}
