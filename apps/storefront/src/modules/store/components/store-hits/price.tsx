"use client"

import { indexedCurrency, priceAttribute } from "@lib/search-client"
import { formatMoney } from "@lib/util/money"
import { Text, clx } from "@modules/common/components/ui"
import { useLocale } from "next-intl"

/** The per-currency price fields a hit may carry, e.g. `min_price_usd`. */
export type HitPricing = Record<string, unknown>

type HitPriceProps = {
  hit: HitPricing
  currencyCode: string
}

const amount = (value: unknown) => (typeof value === "number" ? value : null)

const HitPrice = ({ hit, currencyCode }: HitPriceProps) => {
  const locale = useLocale()
  const currency_code = indexedCurrency(currencyCode)
  const min_price = amount(hit[priceAttribute("min_price", currencyCode)])
  const max_price = amount(hit[priceAttribute("max_price", currencyCode)])
  const original_price = amount(
    hit[priceAttribute("original_price", currencyCode)]
  )
  const on_sale = hit[priceAttribute("on_sale", currencyCode)] === true

  if (min_price === null) {
    return null
  }

  const format = (value: number) => formatMoney(value, currency_code, locale)

  const max = max_price ?? min_price
  const isRange = max > min_price

  return (
    <div className="flex items-center gap-x-2 shrink-0" data-testid="product-price">
      {!isRange && on_sale && original_price !== null && (
        <Text
          as="span"
          className="line-through text-ui-fg-muted"
          data-testid="original-price"
        >
          <bdi>{format(original_price)}</bdi>
        </Text>
      )}
      <Text
        as="span"
        className={clx("text-ui-fg-muted", {
          "text-ui-tag-red-text": on_sale,
        })}
        data-testid="price"
      >
        <bdi>{isRange ? `${format(min_price)} - ${format(max)}` : format(min_price)}</bdi>
      </Text>
    </div>
  )
}

export default HitPrice
