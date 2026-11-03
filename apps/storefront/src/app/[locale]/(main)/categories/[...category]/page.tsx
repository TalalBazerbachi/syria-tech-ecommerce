import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { getCategoryByHandle } from "@lib/data/categories"
import { getCategorySeo } from "@lib/data/cms"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import {
  alternatesFor,
  breadcrumbJsonLd,
  faqJsonLd,
  samePathEverywhere,
  type Crumb,
} from "@lib/util/seo"
import { defaultLocale, isAppLocale } from "@i18n/routing"
import { HttpTypes } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import JsonLd from "@modules/common/components/json-ld"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Props = {
  params: Promise<{ category: string[]; locale: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      optionValueIds?: string | string[]
    }
  >
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const locale = isAppLocale(params.locale) ? params.locale : defaultLocale
  const productCategory = await getCategoryByHandle(params.category).catch(
    () => null
  )

  if (!productCategory) {
    notFound()
  }

  const seo = await getCategorySeo(productCategory.handle, locale)
  const title = seo?.seoTitle || productCategory.name
  const description =
    seo?.seoDescription || productCategory.description || title

  return {
    title: seo?.seoTitle ? { absolute: seo.seoTitle } : title,
    description,
    alternates: alternatesFor(
      locale,
      samePathEverywhere(`/categories/${params.category.join("/")}`)
    ),
    openGraph: { title, description, type: "website" },
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const locale = isAppLocale(params.locale) ? params.locale : defaultLocale
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const productCategory = await getCategoryByHandle(params.category).catch(
    () => null
  )

  if (!productCategory) {
    notFound()
  }

  const [seo, t] = await Promise.all([
    getCategorySeo(productCategory.handle, locale),
    getTranslations("common"),
  ])

  const crumbs: Crumb[] = [{ name: t("home"), path: "/" }]
  const chain: HttpTypes.StoreProductCategory[] = []
  for (
    let node: HttpTypes.StoreProductCategory | null | undefined = productCategory;
    node;
    node = node.parent_category
  ) {
    chain.unshift(node)
  }
  for (const node of chain) {
    crumbs.push({ name: node.name, path: `/categories/${node.handle}` })
  }

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(locale, crumbs)} />
      <JsonLd data={seo ? faqJsonLd(seo.faq) : null} />
      <CategoryTemplate
        category={productCategory}
        seo={seo}
        sortBy={sortBy}
        page={page}
        optionValueIds={optionValueIds}
      />
    </>
  )
}
