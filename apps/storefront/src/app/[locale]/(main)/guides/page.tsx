import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ARTICLE_KINDS, listArticles, type ArticleKind } from "@lib/data/cms"
import { alternatesFor, breadcrumbJsonLd, samePathEverywhere } from "@lib/util/seo"
import { defaultLocale, isAppLocale } from "@i18n/routing"
import JsonLd from "@modules/common/components/json-ld"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heading, Text, clx } from "@modules/common/components/ui"
import ArticleCard from "@modules/guides/components/article-card"
import { Pagination } from "@modules/store/components/pagination"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; kind?: string }>
}

function parseKind(value: string | undefined): ArticleKind | null {
  return value && (ARTICLE_KINDS as readonly string[]).includes(value)
    ? (value as ArticleKind)
    : null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const { page } = await props.searchParams
  const t = await getTranslations("guides")
  const pageNumber = Math.max(1, parseInt(page ?? "1") || 1)

  return {
    title: pageNumber > 1 ? `${t("metaTitle")} — ${t("page", { page: pageNumber })}` : t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, samePathEverywhere("/guides")),
    // Filtered/paginated views are not canonical; the first page is.
    robots: pageNumber > 1 ? { index: false, follow: true } : undefined,
  }
}

/** `/[locale]/guides`: published Strapi articles, newest first, 12 per page. */
export default async function GuidesPage(props: Props) {
  const { locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const searchParams = await props.searchParams
  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1)
  const kind = parseKind(searchParams.kind)

  const [t, tCommon, result] = await Promise.all([
    getTranslations("guides"),
    getTranslations("common"),
    listArticles(locale, { page, kind }),
  ])

  return (
    <div className="content-container py-12 small:py-16 flex flex-col gap-y-10">
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: tCommon("home"), path: "/" },
          { name: t("title"), path: "/guides" },
        ])}
      />
      <header className="flex flex-col gap-y-3 max-w-3xl">
        <Heading level="h1" className="text-3xl leading-10 text-ui-fg-base">
          {t("title")}
        </Heading>
        <Text className="text-large-regular text-ui-fg-subtle">{t("intro")}</Text>
      </header>

      <nav aria-label={t("filterLabel")} className="flex flex-wrap gap-2">
        <LocalizedClientLink
          href="/guides"
          className={clx(
            "rounded-full border px-4 py-1.5 txt-compact-small transition-colors",
            kind === null
              ? "border-ui-fg-base bg-ui-fg-base text-ui-fg-on-color"
              : "border-ui-border-base text-ui-fg-subtle hover:border-ui-fg-base"
          )}
          aria-current={kind === null ? "page" : undefined}
        >
          {t("allKinds")}
        </LocalizedClientLink>
        {ARTICLE_KINDS.map((k) => (
          <LocalizedClientLink
            key={k}
            href={`/guides?kind=${k}`}
            className={clx(
              "rounded-full border px-4 py-1.5 txt-compact-small transition-colors",
              kind === k
                ? "border-ui-fg-base bg-ui-fg-base text-ui-fg-on-color"
                : "border-ui-border-base text-ui-fg-subtle hover:border-ui-fg-base"
            )}
            aria-current={kind === k ? "page" : undefined}
          >
            {t(`kinds.${k}`)}
          </LocalizedClientLink>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <Text className="text-base-regular text-ui-fg-subtle" data-testid="guides-empty">
          {t("empty")}
        </Text>
      ) : (
        <ul
          className="grid grid-cols-1 small:grid-cols-2 medium:grid-cols-3 gap-x-6 gap-y-10"
          data-testid="guides-list"
        >
          {result.items.map((article) => (
            <li key={`${article.documentId}-${article.slug}`}>
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      )}

      {result.pageCount > 1 && (
        <Pagination page={result.page} totalPages={result.pageCount} data-testid="guides-pagination" />
      )}
    </div>
  )
}
