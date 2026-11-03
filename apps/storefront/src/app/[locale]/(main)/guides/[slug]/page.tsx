import { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"

import { TrackGuideViewed } from "@lib/analytics/trackers"
import { listProductsByHandles } from "@lib/data/catalog"
import { getArticle, type LocaleSlugs } from "@lib/data/cms"
import { getRegion } from "@lib/data/regions"
import {
  alternatesFor,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  type LocalePaths,
} from "@lib/util/seo"
import { defaultLocale, isAppLocale, type AppLocale } from "@i18n/routing"
import FaqBlock from "@modules/common/components/faq-block"
import JsonLd from "@modules/common/components/json-ld"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Prose from "@modules/common/components/prose"
import { Heading, Text } from "@modules/common/components/ui"
import ProductGrid from "@modules/products/components/product-grid"

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

/** `/guides/<slug>` per locale, from the article's `localizations`. */
function guidePaths(slugs: LocaleSlugs, locale: AppLocale, slug: string): LocalePaths {
  const paths: LocalePaths = { [locale]: `/guides/${slug}` }
  for (const [l, s] of Object.entries(slugs) as [AppLocale, string][]) {
    paths[l] = `/guides/${s}`
  }
  return paths
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug, locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const article = await getArticle(slug, locale)

  if (!article) {
    notFound()
  }

  const title = article.seoTitle || article.title
  const description = article.seoDescription || article.excerpt || undefined

  return {
    title: article.seoTitle ? { absolute: article.seoTitle } : title,
    description,
    alternates: alternatesFor(locale, guidePaths(article.slugs, locale, article.slug)),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt ?? undefined,
      images: article.cover ? [article.cover.url] : [],
    },
  }
}

/** `/[locale]/guides/[slug]`: article body, FAQ and related Medusa products by handle. */
export default async function GuidePage(props: Props) {
  const { slug, locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const article = await getArticle(slug, locale)

  if (!article) {
    notFound()
  }

  const [t, tCommon, format, region, related] = await Promise.all([
    getTranslations("guides"),
    getTranslations("common"),
    getFormatter(),
    getRegion().catch(() => null),
    listProductsByHandles(article.relatedProductHandles),
  ])

  const path = `/guides/${article.slug}`
  const published = article.publishedAt ? new Date(article.publishedAt) : null

  return (
    <div className="content-container py-12 small:py-16 flex flex-col gap-y-12">
      <TrackGuideViewed slug={article.slug} kind={article.kind ?? null} />
      <JsonLd
        data={articleJsonLd({
          locale,
          path,
          headline: article.title,
          description: article.seoDescription || article.excerpt,
          image: article.cover?.url ?? null,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          publisher: tCommon("storeName"),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: tCommon("home"), path: "/" },
          { name: t("title"), path: "/guides" },
          { name: article.title, path },
        ])}
      />
      <JsonLd data={faqJsonLd(article.faq)} />

      <article className="max-w-3xl mx-auto w-full flex flex-col gap-y-8" data-testid="guide-article">
        <header className="flex flex-col gap-y-4">
          <LocalizedClientLink
            href="/guides"
            className="txt-compact-small text-ui-fg-muted hover:text-ui-fg-base"
          >
            ← {t("backToGuides")}
          </LocalizedClientLink>
          <div className="flex items-center gap-x-2 txt-compact-xsmall-plus uppercase text-ui-fg-muted">
            {article.kind && <span>{t(`kinds.${article.kind}`)}</span>}
            {article.kind && published && <span aria-hidden="true">·</span>}
            {published && !Number.isNaN(published.getTime()) && (
              <time dateTime={article.publishedAt ?? undefined}>
                {format.dateTime(published, { dateStyle: "long" })}
              </time>
            )}
          </div>
          <Heading level="h1" className="text-3xl leading-10 text-ui-fg-base">
            {article.title}
          </Heading>
          {article.excerpt && (
            <Text className="text-large-regular text-ui-fg-subtle">{article.excerpt}</Text>
          )}
          {article.cover && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-large bg-ui-bg-subtle">
              <Image
                src={article.cover.url}
                alt={article.cover.alt ?? article.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}
        </header>

        {article.bodyHtml && <Prose html={article.bodyHtml} data-testid="guide-body" />}

        {article.faq.length > 0 && (
          <FaqBlock items={article.faq} heading={tCommon("faq")} className="flex flex-col gap-y-4" />
        )}
      </article>

      {region && related.length > 0 && (
        <div className="max-w-5xl mx-auto w-full">
          <ProductGrid
            products={related}
            region={region}
            heading={t("relatedProducts")}
            data-testid="guide-related-products"
          />
        </div>
      )}
    </div>
  )
}
