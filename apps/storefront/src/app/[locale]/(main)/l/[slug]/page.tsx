import { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { TrackLandingPageViewed } from "@lib/analytics/trackers"
import {
  listProductsByCollectionHandle,
  listProductsByHandles,
} from "@lib/data/catalog"
import { getLandingPage, type LandingSection, type LocaleSlugs } from "@lib/data/cms"
import { getRegion } from "@lib/data/regions"
import { alternatesFor, breadcrumbJsonLd, faqJsonLd, type LocalePaths } from "@lib/util/seo"
import { defaultLocale, isAppLocale, type AppLocale } from "@i18n/routing"
import { HttpTypes } from "@medusajs/types"
import FaqBlock from "@modules/common/components/faq-block"
import JsonLd from "@modules/common/components/json-ld"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Prose from "@modules/common/components/prose"
import { Button, Heading, Text } from "@modules/common/components/ui"
import ProductGrid from "@modules/products/components/product-grid"

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

function landingPaths(slugs: LocaleSlugs, locale: AppLocale, slug: string): LocalePaths {
  const paths: LocalePaths = { [locale]: `/l/${slug}` }
  for (const [l, s] of Object.entries(slugs) as [AppLocale, string][]) {
    paths[l] = `/l/${s}`
  }
  return paths
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug, locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const page = await getLandingPage(slug, locale)

  if (!page) {
    notFound()
  }

  const title = page.seoTitle || page.title
  const description = page.seoDescription || page.hero?.text || undefined

  return {
    title: page.seoTitle ? { absolute: page.seoTitle } : title,
    description,
    alternates: alternatesFor(locale, landingPaths(page.slugs, locale, page.slug)),
    robots: page.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: page.hero?.image ? [page.hero.image.url] : [],
    },
  }
}

/** Internal links stay locale-aware; anything else is a plain anchor. */
function CtaLink({ href, children }: { href: string; children: React.ReactNode }) {
  const internal = href.startsWith("/") && !href.startsWith("//")
  return internal ? (
    <LocalizedClientLink href={href}>{children}</LocalizedClientLink>
  ) : (
    <a href={href} rel="noopener noreferrer">
      {children}
    </a>
  )
}

async function ProductGridSection({
  section,
  region,
}: {
  section: Extract<LandingSection, { type: "product-grid" }>
  region: HttpTypes.StoreRegion
}) {
  let products: HttpTypes.StoreProduct[] = []
  if (section.productHandles.length) {
    products = await listProductsByHandles(section.productHandles)
  }
  if (!products.length && section.collectionHandle) {
    products = await listProductsByCollectionHandle(section.collectionHandle)
  }
  if (!products.length) {
    return null
  }
  return <ProductGrid products={products} region={region} heading={section.heading} />
}

/** `/[locale]/l/[slug]`: Strapi landing page (hero + dynamic-zone sections). */
export default async function LandingPage(props: Props) {
  const { slug, locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const page = await getLandingPage(slug, locale)

  if (!page) {
    notFound()
  }

  const [t, region] = await Promise.all([
    getTranslations("common"),
    getRegion().catch(() => null),
  ])

  const faqItems = page.sections.flatMap((s) => (s.type === "faq-list" ? s.items : []))
  const hero = page.hero

  return (
    <div className="flex flex-col" data-testid="landing-page">
      <TrackLandingPageViewed slug={page.slug} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t("home"), path: "/" },
          { name: page.title, path: `/l/${page.slug}` },
        ])}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="w-full border-b border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container grid grid-cols-1 small:grid-cols-2 items-center gap-8 py-12 small:py-24">
          <div className="flex flex-col gap-6 text-center small:text-start items-center small:items-start">
            <Heading level="h1" className="text-3xl small:text-4xl leading-tight text-ui-fg-base">
              {hero?.heading ?? page.title}
            </Heading>
            {hero?.text && (
              <Text className="text-large-regular text-ui-fg-subtle max-w-prose">
                {hero.text}
              </Text>
            )}
            {hero?.ctaHref && hero.ctaLabel && (
              <CtaLink href={hero.ctaHref}>
                <Button variant="primary" size="large">
                  {hero.ctaLabel}
                </Button>
              </CtaLink>
            )}
          </div>
          {hero?.image && (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-large bg-ui-bg-base">
              <Image
                src={hero.image.url}
                alt={hero.image.alt ?? hero.heading ?? page.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          )}
        </div>
      </section>

      <div className="content-container flex flex-col gap-y-16 py-12 small:py-16">
        {page.sections.map((section, index) => {
          switch (section.type) {
            case "richtext":
              return (
                <Prose key={index} html={section.html} className="max-w-3xl mx-auto w-full" />
              )
            case "product-grid":
              return region ? (
                <ProductGridSection key={index} section={section} region={region} />
              ) : null
            case "faq-list":
              return (
                <FaqBlock
                  key={index}
                  items={section.items}
                  heading={section.heading ?? t("faq")}
                />
              )
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}
