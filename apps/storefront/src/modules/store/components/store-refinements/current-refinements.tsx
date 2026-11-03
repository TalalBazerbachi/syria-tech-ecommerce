"use client"

import { XMarkMini } from "@medusajs/icons"
import { useClearRefinements, useCurrentRefinements } from "react-instantsearch"
import { useLocale, useTranslations } from "next-intl"

import { indexedCurrency, priceAttribute } from "@lib/search-client"
import { formatMoney } from "@lib/util/money"
import {
  CATEGORY_ATTRIBUTE,
  LABELS_ATTRIBUTE,
  OPTION_VALUES_ATTRIBUTE,
} from "./attributes"

type Refinement = ReturnType<
  typeof useCurrentRefinements
>["items"][number]["refinements"][number]

const CurrentRefinements = ({ currencyCode }: { currencyCode: string }) => {
  const t = useTranslations("store")
  const locale = useLocale()
  const { items, refine } = useCurrentRefinements()
  const { canRefine: canClearAll, refine: clearAll } = useClearRefinements()

  const refinements = items.flatMap((item) => item.refinements)

  if (!refinements.length) {
    return null
  }

  const refinementLabel = (refinement: Refinement) => {
    const { attribute, label, value, operator } = refinement

    if (attribute === OPTION_VALUES_ATTRIBUTE) {
      const separator = String(value).indexOf(":")

      return separator < 1
        ? label
        : `${String(value).slice(0, separator)}: ${String(value).slice(
            separator + 1
          )}`
    }

    if (attribute === priceAttribute("on_sale", currencyCode)) {
      return t("onSale")
    }

    if (attribute === priceAttribute("min_price", currencyCode)) {
      const amount = formatMoney(
        Number(value),
        indexedCurrency(currencyCode),
        locale,
        { maximumFractionDigits: 0 }
      )

      return operator === "<=" || operator === "<"
        ? t("upTo", { amount })
        : t("from", { amount })
    }

    if (attribute === CATEGORY_ATTRIBUTE) {
      return `${t("category")}: ${label}`
    }

    if (attribute === LABELS_ATTRIBUTE) {
      return `${t("label")}: ${label}`
    }

    return label
  }

  return (
    <div className="flex flex-col gap-y-3" data-testid="current-refinements">
      <div className="flex items-center justify-between gap-x-2 pe-6">
        <span className="txt-compact-small-plus text-ui-fg-subtle">
          {t("appliedFilters")}
        </span>
        {canClearAll && (
          <button
            onClick={clearAll}
            className="txt-compact-small-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
            data-testid="clear-refinements"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      <ul className="flex flex-wrap gap-2 pe-6">
        {refinements.map((refinement) => {
          const label = refinementLabel(refinement)

          return (
            <li
              key={`${refinement.attribute}:${refinement.operator ?? ""}:${
                refinement.value
              }`}
            >
              <button
                onClick={() => refine(refinement)}
                aria-label={t("removeFilter", { label })}
                className="border-ui-border-interactive text-ui-fg-base border text-small-regular h-8 rounded-rounded px-3 flex items-center gap-x-1.5 transition-colors duration-150 hover:bg-ui-bg-base-hover"
                data-testid="remove-refinement"
              >
                {label}
                <XMarkMini className="text-ui-fg-muted" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CurrentRefinements
