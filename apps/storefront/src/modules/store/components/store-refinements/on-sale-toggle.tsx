"use client"

import { useToggleRefinement } from "react-instantsearch"
import { useTranslations } from "next-intl"

import { priceAttribute } from "@lib/search-client"

const OnSaleToggle = ({ currencyCode }: { currencyCode: string }) => {
  const t = useTranslations("store")
  const { value, refine, canRefine } = useToggleRefinement({
    attribute: priceAttribute("on_sale", currencyCode),
    on: true,
  })

  if (!canRefine) {
    return null
  }

  return (
    <label className="flex cursor-pointer items-center gap-x-2">
      <input
        type="checkbox"
        checked={value.isRefined}
        onChange={() => refine(value)}
        className="shrink-0 accent-ui-fg-interactive"
        data-testid="on-sale-toggle"
      />
      <span className="txt-compact-small-plus text-ui-fg-subtle">
        {t("onSaleOnly")}
      </span>
      {typeof value.count === "number" && (
        <span className="text-small-regular text-ui-fg-muted">
          ({value.count})
        </span>
      )}
    </label>
  )
}

export default OnSaleToggle
