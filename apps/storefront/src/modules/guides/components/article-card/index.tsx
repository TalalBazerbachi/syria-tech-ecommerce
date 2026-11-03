import Image from "next/image"
import { getFormatter, getTranslations } from "next-intl/server"

import type { ArticleSummary } from "@lib/data/cms"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"

type ArticleCardProps = {
  article: ArticleSummary
}

/** One entry in the guides list: cover, kind, title, excerpt, date. */
const ArticleCard = async ({ article }: ArticleCardProps) => {
  const [t, format] = await Promise.all([getTranslations("guides"), getFormatter()])
  const published = article.publishedAt ? new Date(article.publishedAt) : null

  return (
    <LocalizedClientLink
      href={`/guides/${article.slug}`}
      className="group flex flex-col gap-y-3"
      data-testid="article-card"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-large bg-ui-bg-subtle shadow-elevation-card-rest group-hover:shadow-elevation-card-hover transition-shadow">
        {article.cover ? (
          <Image
            src={article.cover.url}
            alt={article.cover.alt ?? article.title}
            fill
            sizes="(max-width: 576px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ui-bg-subtle to-ui-bg-base" />
        )}
      </div>
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2 txt-compact-xsmall-plus uppercase text-ui-fg-muted">
          {article.kind && <span>{t(`kinds.${article.kind}`)}</span>}
          {article.kind && published && <span aria-hidden="true">·</span>}
          {published && !Number.isNaN(published.getTime()) && (
            <time dateTime={article.publishedAt ?? undefined}>
              {format.dateTime(published, { dateStyle: "medium" })}
            </time>
          )}
        </div>
        <Text as="span" className="text-large-semi text-ui-fg-base group-hover:underline">
          {article.title}
        </Text>
        {article.excerpt && (
          <Text className="txt-medium text-ui-fg-subtle line-clamp-3">
            {article.excerpt}
          </Text>
        )}
      </div>
    </LocalizedClientLink>
  )
}

export default ArticleCard
