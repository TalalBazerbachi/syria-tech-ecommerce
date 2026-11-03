import { Container, Heading, Text } from "@modules/common/components/ui"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import { getPaymentInfo, isCashOnDelivery, isStripeLike } from "@lib/constants"
import Divider from "@modules/common/components/divider"
import { formatMoney } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const t = useTranslations("checkout")
  const to = useTranslations("order")
  const locale = useLocale()
  const format = useFormatter()
  const payment = order.payment_collections?.[0]?.payments?.[0]
  const info = getPaymentInfo(payment?.provider_id)

  const detail = () => {
    if (!payment) {
      return null
    }
    if (isStripeLike(payment.provider_id) && payment.data?.card_last4) {
      return `**** **** **** ${payment.data.card_last4}`
    }
    const amount = formatMoney(payment.amount, order.currency_code, locale)
    if (isCashOnDelivery(payment.provider_id)) {
      return to("codDueOnDelivery", { amount })
    }
    return to("paidAt", {
      amount,
      date: format.dateTime(new Date(payment.created_at ?? Date.now()), {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    })
  }

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {t("payment")}
      </Heading>
      <div>
        {payment && (
          <div className="flex flex-col xsmall:flex-row items-start gap-x-1 gap-y-4 w-full">
            <div className="flex flex-col xsmall:w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("paymentMethod")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method"
              >
                {info ? t(`methods.${info.key}`) : payment.provider_id}
              </Text>
            </div>
            <div className="flex flex-col xsmall:w-2/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("paymentDetails")}
              </Text>
              <div className="flex gap-2 txt-medium text-ui-fg-subtle items-center">
                {info && (
                  <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                    {info.icon}
                  </Container>
                )}
                <Text data-testid="payment-amount">{detail()}</Text>
              </div>
            </div>
          </div>
        )}
      </div>

      <Divider className="mt-8" />
    </div>
  )
}

export default PaymentDetails
