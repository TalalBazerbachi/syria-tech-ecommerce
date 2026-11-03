import { notFound } from "next/navigation"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { categoryListId } from "@lib/analytics/track"
import type { CategorySeo } from "@lib/data/cms"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { HttpTypes } from "@medusajs/types"
import FaqBlock from "@modules/common/components/faq-block"
import InteractiveLink from "@modules/common/components/interactive-link"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Prose from "@modules/common/components/prose"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"

export default async function CategoryTemplate({
  category,
  seo,
  sortBy,
  page,
  optionValueIds,
}: {
  category: HttpTypes.StoreProductCategory
  /** `category-seo` from Strapi for this handle; `null` when absent. */
  seo?: CategorySeo | null
  sortBy?: SortOptions
  page?: string
  optionValueIds?: OptionValueIds
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category) notFound()

  const t = await getTranslations("common")

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  return (
    <>
      <div
        className="flex flex-col small:flex-row small:items-start py-6 content-container"
        data-testid="category-container"
      >
        <RefinementList
          sortBy={sort}
          data-testid="sort-by-container"
          hideOptionsPicker
        />
        <div className="w-full">
          <div className="flex flex-row mb-8 text-2xl-semi gap-4">
            {parents &&
              parents.map((parent) => (
                <span key={parent.id} className="text-ui-fg-subtle">
                  <LocalizedClientLink
                    className="me-4 hover:text-black"
                    href={`/categories/${parent.handle}`}
                    data-testid="sort-by-link"
                  >
                    {parent.name}
                  </LocalizedClientLink>
                  /
                </span>
              ))}
            <h1 data-testid="category-page-title">{category.name}</h1>
          </div>
          {seo?.introHtml ? (
            <Prose
              html={seo.introHtml}
              className="mb-8 max-w-3xl"
              data-testid="category-intro"
            />
          ) : (
            category.description && (
              <div className="mb-8 text-base-regular">
                <p>{category.description}</p>
              </div>
            )
          )}
          {category.category_children && category.category_children.length > 0 && (
            <div className="mb-8 text-base-large">
              <ul className="grid grid-cols-1 gap-2">
                {category.category_children?.map((c) => (
                  <li key={c.id}>
                    <InteractiveLink href={`/categories/${c.handle}`}>
                      {c.name}
                    </InteractiveLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Suspense
            fallback={
              <SkeletonProductGrid
                numberOfProducts={category.products?.length ?? 8}
              />
            }
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              categoryId={category.id}
              optionValueIds={optionValueIds}
              list={{
                list_id: categoryListId(category.handle),
                category: category.handle,
              }}
            />
          </Suspense>
        </div>
      </div>
      {seo && seo.faq.length > 0 && (
        <div className="content-container my-8 small:my-16">
          <FaqBlock items={seo.faq} heading={t("faq")} />
        </div>
      )}
    </>
  )
}
