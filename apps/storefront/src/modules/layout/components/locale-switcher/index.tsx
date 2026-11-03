"use client"

import { updateCartLocale } from "@lib/data/locale-actions"
import { usePathname, useRouter } from "@i18n/navigation"
import { locales, type AppLocale } from "@i18n/routing"
import { clx } from "@modules/common/components/ui"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useTransition } from "react"

const LOCALE_LABELS: Record<AppLocale, string> = {
  ar: "العربية",
  en: "English",
}

type LocaleSwitcherProps = {
  variant?: "inline" | "menu"
}

/**
 * Switches between `/ar/...` and `/en/...` for the same page. The cart's
 * `locale` is updated first so the backend keeps the customer's language.
 */
const LocaleSwitcher = ({ variant = "inline" }: LocaleSwitcherProps) => {
  const t = useTranslations("common")
  const current = useLocale() as AppLocale
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const switchTo = (locale: AppLocale) => {
    if (locale === current) {
      return
    }
    startTransition(async () => {
      await updateCartLocale(locale)
      const query = searchParams.toString()
      router.replace(
        // `usePathname` from next-intl strips the locale prefix, so the same
        // path is re-rendered under the other locale.
        (query ? `${pathname}?${query}` : pathname) as never,
        { locale }
      )
    })
  }

  return (
    <div
      className={clx("flex items-center gap-x-3", {
        "justify-between w-full": variant === "menu",
      })}
      data-testid="locale-switcher"
    >
      <span className="txt-compact-small">{t("language")}</span>
      <div className="flex items-center gap-x-2" role="group" aria-label={t("language")}>
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            lang={locale}
            onClick={() => switchTo(locale)}
            disabled={isPending}
            aria-pressed={locale === current}
            className={clx("txt-compact-small hover:underline", {
              "font-semibold underline": locale === current,
              "opacity-70": locale !== current,
            })}
            data-testid={`locale-${locale}`}
          >
            {LOCALE_LABELS[locale]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default LocaleSwitcher
