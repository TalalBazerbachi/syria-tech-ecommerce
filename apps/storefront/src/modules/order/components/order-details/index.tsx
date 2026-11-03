import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import { useFormatter, useTranslations } from "next-intl"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const t = useTranslations("order")
  const format = useFormatter()

  const statusLabel = (
    namespace: "fulfillmentStatus" | "paymentStatus",
    status: string
  ) => {
    // Fall back to a readable version of unknown statuses.
    const known = t.has(`${namespace}.${status}`)
    return known
      ? t(`${namespace}.${status}`)
      : status.split("_").join(" ")
  }

  return (
    <div>
      <Text>
        {t.rich("confirmationSentTo", {
          email: order.email ?? "",
          strong: (chunks) => (
            <span
              className="text-ui-fg-medium-plus font-semibold"
              dir="ltr"
              data-testid="order-email"
            >
              {chunks}
            </span>
          ),
        })}
      </Text>
      <Text className="mt-2">
        {t("orderDate")}:{" "}
        <span data-testid="order-date">
          {format.dateTime(new Date(order.created_at), { dateStyle: "long" })}
        </span>
      </Text>
      <Text className="mt-2 text-ui-fg-interactive">
        {t("orderNumber")}: <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text>
              {t("orderStatus")}:{" "}
              <span className="text-ui-fg-subtle " data-testid="order-status">
                {statusLabel("fulfillmentStatus", order.fulfillment_status)}
              </span>
            </Text>
            <Text>
              {t("paymentStatusLabel")}:{" "}
              <span
                className="text-ui-fg-subtle "
                data-testid="order-payment-status"
              >
                {statusLabel("paymentStatus", order.payment_status)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
