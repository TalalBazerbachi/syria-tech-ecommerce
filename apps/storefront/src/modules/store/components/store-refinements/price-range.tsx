"use client"

import * as Slider from "@radix-ui/react-slider"
import { useEffect, useState } from "react"
import { useRange } from "react-instantsearch"
import { useLocale, useTranslations } from "next-intl"

import { indexedCurrency, priceAttribute } from "@lib/search-client"
import { formatMoney } from "@lib/util/money"

/**
 * Price filter over the region currency's `min_price_*` field. Refines on
 * release rather than per pixel.
 */
const PriceRange = ({ currencyCode }: { currencyCode: string }) => {
  const t = useTranslations("store")
  const locale = useLocale()
  const { start, range, canRefine, refine } = useRange({
    attribute: priceAttribute("min_price", currencyCode),
  })
  const currency = indexedCurrency(currencyCode)
  const format = (amount: number) =>
    formatMoney(amount, currency, locale, { maximumFractionDigits: 0 })

  const min = Math.floor(range.min ?? 0)
  const max = Math.ceil(range.max ?? 0)

  const from = Number.isFinite(start[0]) ? (start[0] as number) : min
  const to = Number.isFinite(start[1]) ? (start[1] as number) : max

  const [value, setValue] = useState<number[]>([from, to])

  useEffect(() => {
    setValue([from, to])
  }, [from, to])

  if (!canRefine || min >= max) {
    return null
  }

  return (
    <div className="flex flex-col gap-y-4">
      <span className="txt-compact-small-plus text-ui-fg-subtle">{t("price")}</span>

      <div className="flex flex-col gap-y-3 pe-6">
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          value={value}
          min={min}
          max={max}
          step={1}
          minStepsBetweenThumbs={0}
          onValueChange={setValue}
          onValueCommit={(committed) => refine([committed[0], committed[1]])}
          aria-label={t("priceRange")}
          data-testid="price-range"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <Slider.Track className="relative h-0.5 w-full grow rounded-full bg-ui-border-base">
            <Slider.Range className="absolute h-full rounded-full bg-ui-fg-interactive" />
          </Slider.Track>
          {value.map((_, index) => (
            <Slider.Thumb
              key={index}
              className="block h-4 w-4 rounded-full border border-ui-border-interactive bg-ui-bg-base shadow-elevation-card-rest outline-none focus-visible:ring-2 focus-visible:ring-ui-fg-interactive"
              aria-label={index === 0 ? t("minPrice") : t("maxPrice")}
            />
          ))}
        </Slider.Root>

        <div className="flex items-center justify-between">
          <bdi className="text-small-regular text-ui-fg-subtle">
            {format(value[0])}
          </bdi>
          <bdi className="text-small-regular text-ui-fg-subtle">
            {format(value[1])}
          </bdi>
        </div>
      </div>
    </div>
  )
}

export default PriceRange
