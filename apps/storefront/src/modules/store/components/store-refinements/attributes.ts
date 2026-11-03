import { PRODUCT_INDEX_NAME, priceAttribute } from "@lib/search-client"

export const OPTION_VALUES_ATTRIBUTE = "option_values"
export const CATEGORY_ATTRIBUTE = "category"
// The index calls the product's tags "labels".
export const LABELS_ATTRIBUTE = "labels"

export type SortOptionKey =
  | "relevance"
  | "latest"
  | "priceAsc"
  | "priceDesc"
  | "titleAsc"
  | "titleDesc"

/** Sort values for the index; labels are looked up under `store.sort.<key>`. */
export const getSortOptions = (
  currencyCode: string
): { value: string; key: SortOptionKey }[] => {
  const minPrice = priceAttribute("min_price", currencyCode)

  return [
    { value: PRODUCT_INDEX_NAME, key: "relevance" },
    { value: `${PRODUCT_INDEX_NAME}/sort/created_at:desc`, key: "latest" },
    { value: `${PRODUCT_INDEX_NAME}/sort/${minPrice}:asc`, key: "priceAsc" },
    { value: `${PRODUCT_INDEX_NAME}/sort/${minPrice}:desc`, key: "priceDesc" },
    { value: `${PRODUCT_INDEX_NAME}/sort/title:asc`, key: "titleAsc" },
    { value: `${PRODUCT_INDEX_NAME}/sort/title:desc`, key: "titleDesc" },
  ]
}
