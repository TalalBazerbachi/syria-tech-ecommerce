"use client"

import { useSortBy } from "react-instantsearch"
import { useTranslations } from "next-intl"

import FilterRadioGroup from "@modules/common/components/filter-radio-group"
import {
  CATEGORY_ATTRIBUTE,
  LABELS_ATTRIBUTE,
  getSortOptions,
} from "./attributes"
import CurrentRefinements from "./current-refinements"
import OnSaleToggle from "./on-sale-toggle"
import OptionRefinements from "./option-refinements"
import PriceRange from "./price-range"
import RefinementGroup from "./refinement-group"

const SortProducts = ({ currencyCode }: { currencyCode: string }) => {
  const t = useTranslations("store")
  const options = getSortOptions(currencyCode)
  const items = options.map((o) => ({ value: o.value, label: t(`sort.${o.key}`) }))
  const { currentRefinement, refine } = useSortBy({ items })

  return (
    <FilterRadioGroup
      title={t("sortBy")}
      items={items}
      value={currentRefinement}
      handleChange={refine}
      data-testid="sort-by-container"
    />
  )
}

const StoreRefinements = ({ currencyCode }: { currencyCode: string }) => {
  const t = useTranslations("store")

  return (
    <div className="flex flex-col gap-12 py-4 mb-8 small:px-0 ps-6 small:w-[250px] small:shrink-0 small:ms-[1.675rem]">
      <SortProducts currencyCode={currencyCode} />
      <CurrentRefinements currencyCode={currencyCode} />
      <OptionRefinements />
      <PriceRange currencyCode={currencyCode} />
      <OnSaleToggle currencyCode={currencyCode} />
      <RefinementGroup attribute={CATEGORY_ATTRIBUTE} title={t("category")} />
      <RefinementGroup attribute={LABELS_ATTRIBUTE} title={t("labels")} />
    </div>
  )
}

export default StoreRefinements
