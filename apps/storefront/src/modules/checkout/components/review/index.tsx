"use client"

import { isCashOnDelivery } from "@lib/constants"
import { formatMoney } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text, clx } from "@modules/common/components/ui"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import PaymentButton from "../payment-button"

const Review = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const t = useTranslations("checkout")
  const tc = useTranslations("common")
  const locale = useLocale()
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    cart.payment_collection

  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
  const cod = isCashOnDelivery(activeSession?.provider_id)

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none": !isOpen,
            }
          )}
        >
          {t("review")}
        </Heading>
      </div>
      {isOpen && previousStepsCompleted && (
        <>
          <div className="flex flex-col gap-y-3 w-full mb-6">
            {cod && (
              <Text
                className="txt-medium text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
                data-testid="cod-review-note"
              >
                {t("codReviewNote", {
                  amount: formatMoney(cart.total ?? 0, cart.currency_code, locale),
                })}
              </Text>
            )}
            <Text className="txt-medium-plus text-ui-fg-base">
              {t("terms", { store: tc("storeName") })}
            </Text>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
    </div>
  )
}

export default Review
