"use client"

import { formatMoney } from "@lib/util/money"
import { useLocale, useTranslations } from "next-intl"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const t = useTranslations("cart")
  const locale = useLocale()
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  const money = (amount?: number | null) =>
    formatMoney(amount ?? 0, currency_code, locale)

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle ">
        <div className="flex items-center justify-between">
          <span>{t("subtotalExcl")}</span>
          <bdi data-testid="cart-subtotal" data-value={item_subtotal || 0}>
            {money(item_subtotal)}
          </bdi>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("shipping")}</span>
          <bdi data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
            {money(shipping_subtotal)}
          </bdi>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>{t("discount")}</span>
            <bdi
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              - {money(discount_subtotal)}
            </bdi>
          </div>
        )}
        {!!tax_total && (
          <div className="flex justify-between">
            <span className="flex gap-x-1 items-center ">{t("taxes")}</span>
            <bdi data-testid="cart-taxes" data-value={tax_total || 0}>
              {money(tax_total)}
            </bdi>
          </div>
        )}
      </div>
      <div className="h-px w-full border-b border-gray-200 my-4" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium ">
        <span>{t("total")}</span>
        <bdi
          className="txt-xlarge-plus"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {money(total)}
        </bdi>
      </div>
      <div className="h-px w-full border-b border-gray-200 mt-4" />
    </div>
  )
}

export default CartTotals
