"use client"

import { formatMoney } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import { useLocale, useTranslations } from "next-intl"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemUnitPriceProps) => {
  const t = useTranslations("product")
  const locale = useLocale()
  const total = item.total ?? 0
  const original_total = item.original_total ?? 0
  const hasReducedPrice = total < original_total

  const percentage_diff = Math.round(
    ((original_total - total) / original_total) * 100
  )

  return (
    <div className="flex flex-col text-ui-fg-muted justify-center h-full">
      {hasReducedPrice && (
        <>
          <p>
            {style === "default" && (
              <span className="text-ui-fg-muted">{t("original")}: </span>
            )}
            <bdi
              className="line-through"
              data-testid="product-unit-original-price"
            >
              {formatMoney(original_total / item.quantity, currencyCode, locale)}
            </bdi>
          </p>
          {style === "default" && (
            <span className="text-ui-fg-interactive">-{percentage_diff}%</span>
          )}
        </>
      )}
      <bdi
        className={clx("text-base-regular", {
          "text-ui-fg-interactive": hasReducedPrice,
        })}
        data-testid="product-unit-price"
      >
        {formatMoney(total / item.quantity, currencyCode, locale)}
      </bdi>
    </div>
  )
}

export default LineItemUnitPrice
