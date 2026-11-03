import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { HttpTypes } from "@medusajs/types"

import { getProductSeo } from "@lib/data/cms"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { markdownToPlainText, markdownToSafeHtml } from "@lib/util/markdown"
import {
  alternatesFor,
  breadcrumbJsonLd,
  faqJsonLd,
  productJsonLd,
  samePathEverywhere,
  type ProductOffer,
} from "@lib/util/seo"
import { isAppLocale, defaultLocale } from "@i18n/routing"
import JsonLd from "@modules/common/components/json-ld"
import ProductTemplate from "@modules/products/templates"

type Props = {
  params: Promise<{ locale: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

type PricedVariant = HttpTypes.StoreProductVariant & {
  calculated_price?: { calculated_amount?: number | null; currency_code?: string | null }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

async function loadProduct(handle: string) {
  const region = await getRegion()
  if (!region) {
    return { region: null, product: null }
  }

  const product = await listProducts({
    queryParams: { handle },
  }).then(({ response }) => response.products[0] ?? null)

  return { region, product }
}

/**
 * One `Offer` per variant. Amounts come from `calculated_price` so the
 * currency is whatever the region priced the product in; the storefront
 * never assumes USD.
 */
function offersFor(product: HttpTypes.StoreProduct): ProductOffer[] {
  return ((product.variants ?? []) as PricedVariant[])
    .map((variant) => {
      const amount = variant.calculated_price?.calculated_amount
      const currency = variant.calculated_price?.currency_code
      if (typeof amount !== "number" || !currency) {
        return null
      }
      const inStock =
        !variant.manage_inventory ||
        !!variant.allow_backorder ||
        (variant.inventory_quantity ?? 0) > 0
      return { price: amount, currency, inStock, sku: variant.sku ?? null }
    })
    .filter((offer): offer is ProductOffer => offer !== null)
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { handle, locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const { product } = await loadProduct(handle)

  if (!product) {
    notFound()
  }

  const seo = await getProductSeo(product.handle ?? handle, locale)
  const title = seo?.seoTitle || product.title
  const description =
    seo?.seoDescription ||
    markdownToPlainText(product.description) ||
    product.title

  return {
    // A CMS seoTitle is the complete <title>; skip the "| Store" template.
    title: seo?.seoTitle ? { absolute: seo.seoTitle } : title,
    description,
    alternates: alternatesFor(locale, samePathEverywhere(`/products/${product.handle}`)),
    openGraph: {
      title,
      description,
      type: "website",
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const { handle, locale: rawLocale } = await props.params
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  const { region, product } = await loadProduct(handle)

  if (!region || !product) {
    notFound()
  }

  // Strapi is optional: `null` when unreachable or when no entry exists.
  const [seo, t] = await Promise.all([
    getProductSeo(product.handle ?? handle, locale),
    getTranslations("common"),
  ])
  const images = getImagesForVariant(product, selectedVariantId)
  const descriptionHtml = markdownToSafeHtml(product.description)
  const productPath = `/products/${product.handle}`

  const crumbs = [{ name: t("home"), path: "/" }, { name: t("store"), path: "/store" }]
  const category = product.categories?.[0]
  if (category?.handle && category.name) {
    crumbs.push({ name: category.name, path: `/categories/${category.handle}` })
  }
  crumbs.push({ name: product.title, path: productPath })

  return (
    <>
      <JsonLd
        data={productJsonLd({
          locale,
          path: productPath,
          name: product.title,
          description:
            seo?.seoDescription || markdownToPlainText(product.description, 500),
          images: [
            ...(product.thumbnail ? [product.thumbnail] : []),
            ...(product.images ?? []).map((i) => i.url).filter(Boolean),
          ].filter((url, i, all) => all.indexOf(url) === i),
          brand:
            typeof product.metadata?.brand === "string" ? product.metadata.brand : null,
          offers: offersFor(product),
        })}
      />
      <JsonLd data={breadcrumbJsonLd(locale, crumbs)} />
      <JsonLd data={seo ? faqJsonLd(seo.faq) : null} />
      <ProductTemplate
        product={product}
        region={region}
        images={images ?? []}
        descriptionHtml={descriptionHtml}
        seo={seo}
      />
    </>
  )
}
