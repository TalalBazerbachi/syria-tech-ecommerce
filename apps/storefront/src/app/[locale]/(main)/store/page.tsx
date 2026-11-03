import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { getRegion } from "@lib/data/regions"
import { alternatesFor, samePathEverywhere } from "@lib/util/seo"
import { defaultLocale, isAppLocale } from "@i18n/routing"
import StoreTemplate from "@modules/store/templates"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const t = await getTranslations("store")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, samePathEverywhere("/store")),
  }
}

export default async function StorePage() {
  const region = await getRegion()

  if (!region) {
    notFound()
  }

  return <StoreTemplate currencyCode={region.currency_code} />
}
