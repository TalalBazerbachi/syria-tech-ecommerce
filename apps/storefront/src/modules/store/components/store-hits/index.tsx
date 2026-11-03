"use client"

import type { Hit } from "instantsearch.js"
import { useEffect, useRef } from "react"
import { useHits, useInstantSearch } from "react-instantsearch"
import { useTranslations } from "next-intl"

import { trackProductListViewed } from "@lib/analytics/track"
import useSearchSettled from "@lib/hooks/use-search-settled"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import Thumbnail from "@modules/products/components/thumbnail"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import SearchPagination from "./pagination"
import HitPrice, { HitPricing } from "./price"

type ProductHit = Hit<
  {
    title: string | null
    handle: string | null
    thumbnail: string | null
  } & HitPricing
>

type StoreHitsProps = {
  hitsPerPage: number
  currencyCode: string
}

const StoreHits = ({ hitsPerPage, currencyCode }: StoreHitsProps) => {
  const t = useTranslations("store")
  const { items } = useHits<ProductHit>()
  const { status, error, indexUiState, results } = useInstantSearch()
  const { isSearching, hasNoResultsYet, isSettled } = useSearchSettled()

  const { page, ...refinements } = indexUiState
  const currentPage = page ?? 1
  const refinementKey = JSON.stringify(refinements)

  const settled = useRef({ page: currentPage, refinementKey })

  useEffect(() => {
    if (!isSearching) {
      settled.current = { page: currentPage, refinementKey }
    }
  }, [isSearching, currentPage, refinementKey])

  // `Product List Viewed` once per settled (query, refinements, page) combination.
  const query = (indexUiState.query ?? "").trim()
  const resultCount = results?.nbHits ?? items.length
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!isSettled || status === "error") {
      return
    }
    const key = `${refinementKey}|${currentPage}`
    if (lastTracked.current === key) {
      return
    }
    lastTracked.current = key
    trackProductListViewed({
      list_id: query ? "search" : "store",
      query: query || null,
      result_count: resultCount,
    })
  }, [isSettled, status, refinementKey, currentPage, query, resultCount])

  const isPagingOnly =
    refinementKey === settled.current.refinementKey &&
    currentPage !== settled.current.page

  const showSkeleton = hasNoResultsYet || (isSearching && isPagingOnly)

  if (status === "error") {
    return (
      <Text
        className="py-16 text-center text-ui-fg-error"
        data-testid="products-error"
      >
        {t("couldNotLoad")}
        {error?.message ? `: ${error.message}` : "."}
      </Text>
    )
  }

  return (
    <>
      {showSkeleton ? (
        <SkeletonProductGrid numberOfProducts={hitsPerPage} />
      ) : !items.length ? (
        <Text
          className="py-16 text-center text-ui-fg-subtle"
          data-testid="no-products"
        >
          {t("noProducts")}
        </Text>
      ) : (
        <ul
          className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
          data-testid="products-list"
        >
          {items.map((hit) =>
            hit.handle ? (
              <li key={hit.objectID}>
                <LocalizedClientLink
                  href={`/products/${hit.handle}`}
                  className="group"
                >
                  <div data-testid="product-wrapper">
                    <Thumbnail
                      thumbnail={hit.thumbnail}
                      size="full"
                      alt={hit.title ?? ""}
                    />
                    <div className="flex txt-compact-medium mt-4 justify-between gap-x-2">
                      <Text
                        className="text-ui-fg-subtle"
                        data-testid="product-title"
                      >
                        {hit.title}
                      </Text>
                      <HitPrice hit={hit} currencyCode={currencyCode} />
                    </div>
                  </div>
                </LocalizedClientLink>
              </li>
            ) : null
          )}
        </ul>
      )}
      <SearchPagination />
    </>
  )
}

export default StoreHits
