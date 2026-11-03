"use client"

import { Button } from "@modules/common/components/ui"
import { useMemo } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { formatMoney } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const t = useTranslations("order")
  const locale = useLocale()
  const format = useFormatter()

  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const numberOfProducts = useMemo(() => {
    return order.items?.length ?? 0
  }, [order])

  return (
    <div className="bg-white flex flex-col" data-testid="order-card">
      <div className="text-large-semi mb-1">
        #<span data-testid="order-display-id">{order.display_id}</span>
      </div>
      <div className="flex items-center divide-x rtl:divide-x-reverse divide-gray-200 text-small-regular text-ui-fg-base">
        <span className="pe-2" data-testid="order-created-at">
          {format.dateTime(new Date(order.created_at), { dateStyle: "medium" })}
        </span>
        <bdi className="px-2" data-testid="order-amount">
          {formatMoney(order.total, order.currency_code, locale)}
        </bdi>
        <span className="ps-2">{t("itemCount", { count: numberOfLines })}</span>
      </div>
      <div className="grid grid-cols-2 small:grid-cols-4 gap-4 my-4">
        {order.items?.slice(0, 3).map((i) => {
          return (
            <div
              key={i.id}
              className="flex flex-col gap-y-2"
              data-testid="order-item"
            >
              <Thumbnail thumbnail={i.thumbnail} images={[]} size="full" />
              <div className="flex items-center text-small-regular text-ui-fg-base">
                <span
                  className="text-ui-fg-base font-semibold"
                  data-testid="item-title"
                >
                  {i.title}
                </span>
                <span className="ms-2">×</span>
                <span data-testid="item-quantity">{i.quantity}</span>
              </div>
            </div>
          )
        })}
        {numberOfProducts > 4 && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <span className="text-small-regular text-ui-fg-base">
              + {numberOfLines - 4}
            </span>
            <span className="text-small-regular text-ui-fg-base">{t("more")}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
          <Button data-testid="order-details-link" variant="secondary">
            {t("seeDetails")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard
