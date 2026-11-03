import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"

import { getLegalPage, legalPageLocales } from "@lib/data/content"
import { alternatesFor, breadcrumbJsonLd, type LocalePaths } from "@lib/util/seo"
import { defaultLocale, isAppLocale } from "@i18n/routing"
import JsonLd from "@modules/common/components/json-ld"
import Prose from "@modules/common/components/prose"
import { Heading, Text } from "@modules/common/components/ui"

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

async function pathsFor(slug: string): Promise<LocalePaths> {
  const available = await legalPageLocales(slug)
  return Object.fromEntries(available.map((l) => [l, `/pages/${slug}`]))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug, locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const page = await getLegalPage(slug, locale)

  if (!page) {
    notFound()
  }

  return {
    title: page.title,
    description: page.description ?? undefined,
    alternates: alternatesFor(locale, await pathsFor(slug)),
    openGraph: {
      title: page.title,
      description: page.description ?? undefined,
      type: "article",
    },
  }
}

/** Markdown pages from `content/<locale>/<slug>.md` (warranty, returns, delivery, about). */
export default async function LegalPage(props: Props) {
  const { slug, locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const page = await getLegalPage(slug, locale)

  if (!page) {
    notFound()
  }

  const [t, tPages, format] = await Promise.all([
    getTranslations("common"),
    getTranslations("pages"),
    getFormatter(),
  ])

  const updated = page.updated ? new Date(page.updated) : null

  return (
    <div className="content-container py-12 small:py-16">
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t("home"), path: "/" },
          { name: page.title, path: `/pages/${slug}` },
        ])}
      />
      <article className="max-w-3xl mx-auto flex flex-col gap-y-6" data-testid="legal-page">
        <header className="flex flex-col gap-y-2">
          <Heading level="h1" className="text-3xl leading-10 text-ui-fg-base">
            {page.title}
          </Heading>
          {updated && !Number.isNaN(updated.getTime()) && (
            <Text className="txt-small text-ui-fg-muted">
              {tPages("updated", {
                date: format.dateTime(updated, { dateStyle: "long" }),
              })}
            </Text>
          )}
        </header>
        <Prose html={page.html} data-testid="legal-page-body" />
      </article>
    </div>
  )
}
