"use client"

import { getPercentageDiff } from "@lib/util/get-percentage-diff"
import { formatMoney } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import { useLocale, useTranslations } from "next-intl"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemPriceProps) => {
  const t = useTranslations("product")
  const locale = useLocale()
  const { total, original_total } = item
  const originalPrice = original_total ?? 0
  const currentPrice = total ?? 0
  const hasReducedPrice = currentPrice < originalPrice

  return (
    <div className="flex flex-col gap-x-2 text-ui-fg-subtle items-end">
      <div className="text-end">
        {hasReducedPrice && (
          <>
            <p>
              {style === "default" && (
                <span className="text-ui-fg-subtle">{t("original")}: </span>
              )}
              <bdi
                className="line-through text-ui-fg-muted"
                data-testid="product-original-price"
              >
                {formatMoney(originalPrice, currencyCode, locale)}
              </bdi>
            </p>
            {style === "default" && (
              <span className="text-ui-fg-interactive">
                -{getPercentageDiff(originalPrice, currentPrice || 0)}%
              </span>
            )}
          </>
        )}
        <bdi
          className={clx("text-base-regular", {
            "text-ui-fg-interactive": hasReducedPrice,
          })}
          data-testid="product-price"
        >
          {formatMoney(currentPrice, currencyCode, locale)}
        </bdi>
      </div>
    </div>
  )
}

export default LineItemPrice
