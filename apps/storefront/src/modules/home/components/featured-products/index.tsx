import { getTranslations } from "next-intl/server"
import { HttpTypes } from "@medusajs/types"

import { getCollectionByHandle } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import InteractiveLink from "@modules/common/components/interactive-link"
import ProductGrid from "@modules/products/components/product-grid"

/** Handle of the Medusa collection ops curate for the homepage (see docs/architecture.md). */
export const FEATURED_COLLECTION_HANDLE = "featured"
const LIMIT = 8

/**
 * Homepage product grid: the `featured` collection when it exists and has
 * products, otherwise the latest products. Medusa errors render nothing.
 */
export default async function FeaturedProducts({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  const t = await getTranslations("home")

  const collection = await getCollectionByHandle(FEATURED_COLLECTION_HANDLE).catch(
    () => null
  )

  let products: HttpTypes.StoreProduct[] = []
  if (collection) {
    products = await listProducts({
      regionId: region.id,
      queryParams: { collection_id: [collection.id], limit: LIMIT },
    })
      .then(({ response }) => response.products)
      .catch(() => [])
  }

  const featured = products.length > 0
  if (!featured) {
    products = await listProducts({
      regionId: region.id,
      queryParams: { limit: LIMIT, order: "-created_at" },
    })
      .then(({ response }) => response.products)
      .catch(() => [])
  }

  if (!products.length) {
    return null
  }

  return (
    <div className="content-container py-12 small:py-24">
      <ProductGrid
        products={products}
        region={region}
        heading={featured ? collection?.title || t("featured") : t("latest")}
        action={
          <InteractiveLink
            href={featured && collection ? `/collections/${collection.handle}` : "/store"}
          >
            {t("viewAll")}
          </InteractiveLink>
        }
        data-testid="home-product-grid"
      />
    </div>
  )
}
