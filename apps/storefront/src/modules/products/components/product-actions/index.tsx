"use client"

import { ensureCartAnalytics } from "@lib/analytics/cart-sync"
import { trackProductAdded } from "@lib/analytics/track"
import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  region,
  disabled,
}: ProductActionsProps) {
  const t = useTranslations("product")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant, isValidVariant])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    if (selectedVariant?.allow_backorder) {
      return true
    }

    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)
    setError(null)

    try {
      const cartId = await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
      })
      if (cartId) {
        trackProductAdded({
          cartId,
          product,
          variant: selectedVariant,
          quantity: 1,
          currency: region.currency_code,
        })
        // The cart may have just been created: put the PostHog identity on it.
        ensureCartAnalytics(cartId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsAdding(false)
    }
  }

  const buttonLabel = !selectedVariant
    ? t("selectVariant")
    : !inStock || !isValidVariant
      ? t("outOfStock")
      : t("addToCart")

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="primary"
          className="w-full h-10"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {buttonLabel}
        </Button>
        {error && (
          <p className="text-rose-500 text-small-regular" data-testid="add-to-cart-error">
            {error}
          </p>
        )}
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
