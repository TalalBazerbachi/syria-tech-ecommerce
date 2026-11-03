import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { getHomeContent } from "@lib/data/content"
import { getRegion } from "@lib/data/regions"
import { alternatesFor, samePathEverywhere } from "@lib/util/seo"
import { defaultLocale, isAppLocale } from "@i18n/routing"
import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const t = await getTranslations("home")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, samePathEverywhere("/")),
  }
}

export default async function Home(props: Props) {
  const { locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale

  const [region, home] = await Promise.all([
    getRegion().catch(() => null),
    getHomeContent(locale),
  ])

  return (
    <>
      <Hero content={home?.hero ?? null} />
      {region && <FeaturedProducts region={region} />}
    </>
  )
}
