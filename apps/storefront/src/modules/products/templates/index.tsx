import React, { Suspense } from "react"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { HttpTypes } from "@medusajs/types"

import { TrackProductViewed } from "@lib/analytics/trackers"
import type { ProductSeo } from "@lib/data/cms"
import FaqBlock from "@modules/common/components/faq-block"
import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductLongDescription from "@modules/products/components/product-long-description"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  images: HttpTypes.StoreProductImage[]
  /** Medusa description as sanitised HTML. */
  descriptionHtml: string | null
  /** Optional SEO copy from Strapi (`product-seo` by handle); `null` when absent. */
  seo?: ProductSeo | null
}

const ProductTemplate = async ({
  product,
  region,
  images,
  descriptionHtml,
  seo,
}: ProductTemplateProps) => {
  if (!product || !product.id) {
    return notFound()
  }

  const t = await getTranslations("common")

  return (
    <>
      <TrackProductViewed product={product} region={region} />
      <div
        className="content-container flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-container"
      >
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfo product={product} descriptionHtml={descriptionHtml} />
          <ProductTabs product={product} />
        </div>
        <div className="block w-full relative">
          <ImageGallery images={images} />
        </div>
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-12">
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>
        </div>
      </div>
      {seo?.longDescriptionHtml && (
        <div className="content-container my-8 small:my-16">
          <ProductLongDescription html={seo.longDescriptionHtml} />
        </div>
      )}
      {seo && seo.faq.length > 0 && (
        <div className="content-container my-8 small:my-16">
          <FaqBlock items={seo.faq} heading={t("faq")} />
        </div>
      )}
      <div
        className="content-container my-16 small:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
