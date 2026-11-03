import { governorateName } from "@lib/data/governorates"
import { addressNotes } from "@lib/util/address"
import { formatMoney } from "@lib/util/money"
import { formatSyrianPhone } from "@lib/util/phone"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"
import { useLocale, useTranslations } from "next-intl"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const t = useTranslations("checkout")
  const ta = useTranslations("address")
  const locale = useLocale()
  const address = order.shipping_address
  const notes = addressNotes(address)
  const method = order.shipping_methods?.[0] as
    | (HttpTypes.StoreOrderShippingMethod & { name?: string })
    | undefined

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {t("delivery")}
      </Heading>
      <div className="flex flex-col xsmall:flex-row items-start gap-x-8 gap-y-4">
        <div
          className="flex flex-col xsmall:w-1/3"
          data-testid="shipping-address-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            {t("deliveryAddress")}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {address?.first_name} {address?.last_name}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {governorateName(address?.province, locale)}
            {address?.city && `, ${address.city}`}
          </Text>
          {address?.address_1 && (
            <Text className="txt-medium text-ui-fg-subtle">{address.address_1}</Text>
          )}
          {address?.address_2 && (
            <Text className="txt-medium text-ui-fg-subtle">
              {ta("landmarkShort")}: {address.address_2}
            </Text>
          )}
          {notes && (
            <Text className="txt-medium text-ui-fg-subtle">
              {ta("notesShort")}: {notes}
            </Text>
          )}
        </div>

        <div
          className="flex flex-col xsmall:w-1/3"
          data-testid="shipping-contact-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">{t("contact")}</Text>
          <Text className="txt-medium text-ui-fg-subtle" dir="ltr">
            {formatSyrianPhone(address?.phone)}
          </Text>
          {order.email && (
            <Text className="txt-medium text-ui-fg-subtle" dir="ltr">
              {order.email}
            </Text>
          )}
        </div>

        <div
          className="flex flex-col xsmall:w-1/3"
          data-testid="shipping-method-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">{t("method")}</Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {method?.name}{" "}
            <bdi>
              ({formatMoney(method?.total ?? 0, order.currency_code, locale)})
            </bdi>
          </Text>
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default ShippingDetails
