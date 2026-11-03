"use client"

import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import { useTranslations } from "next-intl"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const t = useTranslations("product")

  const tabs = [
    {
      label: t("tabs.information"),
      component: <ProductInfoTab product={product} />,
    },
    {
      label: t("tabs.delivery"),
      component: <DeliveryInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  const t = useTranslations("product")

  const rows: { label: string; value: string }[] = [
    ...(product.material ? [{ label: t("material"), value: product.material }] : []),
    ...(product.origin_country
      ? [{ label: t("countryOfOrigin"), value: product.origin_country }]
      : []),
    ...(product.type?.value ? [{ label: t("type"), value: product.type.value }] : []),
    ...(product.weight
      ? [{ label: t("weight"), value: t("weightValue", { grams: product.weight }) }]
      : []),
    ...(product.length && product.width && product.height
      ? [
          {
            label: t("dimensions"),
            value: `${product.length} × ${product.width} × ${product.height}`,
          },
        ]
      : []),
  ]

  if (!rows.length) {
    return (
      <div className="text-small-regular py-8 text-ui-fg-subtle">
        {t("noSpecs")}
      </div>
    )
  }

  return (
    <div className="text-small-regular py-8">
      <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="font-semibold text-ui-fg-base">{row.label}</dt>
            <dd className="text-ui-fg-subtle">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const DeliveryInfoTab = () => {
  const t = useTranslations("product")

  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-2">
          <FastDelivery />
          <div>
            <span className="font-semibold">{t("delivery.title")}</span>
            <p className="max-w-sm">{t("delivery.text")}</p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Refresh />
          <div>
            <span className="font-semibold">{t("cod.title")}</span>
            <p className="max-w-sm">{t("cod.text")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
