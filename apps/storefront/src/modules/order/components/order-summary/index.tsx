import { formatMoney } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { useLocale, useTranslations } from "next-intl"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const t = useTranslations("cart")
  const to = useTranslations("order")
  const locale = useLocale()

  const getAmount = (amount?: number | null) => {
    if (!amount) {
      return
    }

    return formatMoney(amount, order.currency_code, locale)
  }

  return (
    <div>
      <h2 className="text-base-semi">{to("orderSummary")}</h2>
      <div className="text-small-regular text-ui-fg-base my-2">
        <div className="flex items-center justify-between text-base-regular text-ui-fg-base mb-2">
          <span>{t("subtotal")}</span>
          <bdi>{getAmount(order.subtotal)}</bdi>
        </div>
        <div className="flex flex-col gap-y-1">
          {order.discount_total > 0 && (
            <div className="flex items-center justify-between">
              <span>{t("discount")}</span>
              <bdi>- {getAmount(order.discount_total)}</bdi>
            </div>
          )}
          {order.gift_card_total > 0 && (
            <div className="flex items-center justify-between">
              <span>{t("discount")}</span>
              <bdi>- {getAmount(order.gift_card_total)}</bdi>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>{t("shipping")}</span>
            <bdi>{getAmount(order.shipping_total)}</bdi>
          </div>
          {order.tax_total > 0 && (
            <div className="flex items-center justify-between">
              <span>{t("taxes")}</span>
              <bdi>{getAmount(order.tax_total)}</bdi>
            </div>
          )}
        </div>
        <div className="h-px w-full border-b border-gray-200 border-dashed my-4" />
        <div className="flex items-center justify-between text-base-regular text-ui-fg-base mb-2">
          <span>{t("total")}</span>
          <bdi>{getAmount(order.total)}</bdi>
        </div>
      </div>
    </div>
  )
}

export default OrderSummary
