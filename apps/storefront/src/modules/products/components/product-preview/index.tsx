import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getLocale } from "next-intl/server"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const locale = await getLocale()
  const { cheapestPrice } = getProductPrice({
    product,
    locale,
  })

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="full"
          isFeatured={isFeatured}
          alt={product.title}
        />
        <div className="flex txt-compact-medium mt-4 justify-between gap-x-2">
          <Text className="text-ui-fg-subtle" data-testid="product-title">
            {product.title}
          </Text>
          <div className="flex items-center gap-x-2 shrink-0">
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
