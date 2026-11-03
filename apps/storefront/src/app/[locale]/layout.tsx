import AnalyticsConfigScript from "@lib/analytics/config-script"
import AnalyticsRouteProps from "@lib/analytics/route-props"
import { getBaseURL } from "@lib/util/env"
import { fontClassNames } from "@lib/fonts"
import { LOCALE_DIRECTION, routing } from "@i18n/routing"
import { Metadata } from "next"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import "styles/globals.css"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: "common" })

  return {
    metadataBase: new URL(getBaseURL()),
    title: {
      default: t("storeName"),
      template: `%s | ${t("storeName")}`,
    },
    description: t("tagline"),
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      dir={LOCALE_DIRECTION[locale]}
      data-mode="light"
      className={fontClassNames}
    >
      <head>
        {/* Runtime PostHog config for src/instrumentation-client.ts (read at request time). */}
        <AnalyticsConfigScript />
      </head>
      <body className="font-sans">
        <NextIntlClientProvider>
          <main className="relative">{children}</main>
          <Suspense fallback={null}>
            <AnalyticsRouteProps />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
