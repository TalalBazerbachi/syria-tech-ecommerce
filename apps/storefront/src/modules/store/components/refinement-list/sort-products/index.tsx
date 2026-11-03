"use client"

import FilterRadioGroup from "@modules/common/components/filter-radio-group"
import { useTranslations } from "next-intl"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: string) => void
  "data-testid"?: string
}

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const t = useTranslations("store")

  const sortOptions = [
    { value: "created_at", label: t("sort.latest") },
    { value: "price_asc", label: t("sort.priceAsc") },
    { value: "price_desc", label: t("sort.priceDesc") },
  ]

  const handleChange = (value: string) => {
    setQueryParams("sortBy", value as SortOptions)
  }

  return (
    <FilterRadioGroup
      title={t("sortBy")}
      items={sortOptions}
      value={sortBy}
      handleChange={handleChange}
      data-testid={dataTestId}
    />
  )
}

export default SortProducts
