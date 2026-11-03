import { HttpTypes } from "@medusajs/types"

import ProductPreview from "@modules/products/components/product-preview"
import { Heading } from "@modules/common/components/ui"

type ProductGridProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  heading?: string | null
  /** Rendered next to the heading, e.g. a "view all" link. */
  action?: React.ReactNode
  "data-testid"?: string
}

/** A plain responsive grid of product cards, shared by home, guides and landing pages. */
const ProductGrid = ({
  products,
  region,
  heading,
  action,
  "data-testid": testId,
}: ProductGridProps) => {
  if (!products.length) {
    return null
  }

  return (
    <section className="flex flex-col gap-y-8" data-testid={testId}>
      {(heading || action) && (
        <div className="flex items-end justify-between gap-4">
          {heading ? (
            <Heading level="h2" className="text-2xl-regular text-ui-fg-base">
              {heading}
            </Heading>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
        {products.map((product) => (
          <li key={product.id}>
            <ProductPreview product={product} region={region} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProductGrid
