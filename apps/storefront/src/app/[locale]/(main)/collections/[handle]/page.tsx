import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { alternatesFor, samePathEverywhere } from "@lib/util/seo"
import { defaultLocale, isAppLocale } from "@i18n/routing"

type Props = {
  params: Promise<{ handle: string; locale: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      page?: string
      sortBy?: SortOptions
      optionValueIds?: string | string[]
    }
  >
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const locale = isAppLocale(params.locale) ? params.locale : defaultLocale
  const collection = await getCollectionByHandle(params.handle).catch(() => null)

  if (!collection) {
    notFound()
  }

  return {
    title: collection.title,
    description: collection.title,
    alternates: alternatesFor(locale, samePathEverywhere(`/collections/${params.handle}`)),
  }
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const collection = await getCollectionByHandle(params.handle).catch(() => null)

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      optionValueIds={optionValueIds}
    />
  )
}
