"use client"

import { Radio as RadioGroupOption } from "@headlessui/react"
import { Text, clx } from "@modules/common/components/ui"
import React, { useContext } from "react"
import { useTranslations } from "next-intl"

import Radio from "@modules/common/components/radio"

import { getPaymentInfo } from "@lib/constants"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { PaymentElement } from "@stripe/react-stripe-js"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  children?: React.ReactNode
}

/**
 * One selectable payment method. The manual provider (`pp_system_default`)
 * is labelled "Cash on delivery" with a one-line explanation of what happens
 * at the door; unknown providers show their id so nothing is silently hidden.
 */
const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  disabled = false,
  children,
}) => {
  const t = useTranslations("checkout")
  const info = getPaymentInfo(paymentProviderId)
  const selected = selectedPaymentOptionId === paymentProviderId

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
        {
          "border-ui-border-interactive": selected,
        }
      )}
      data-testid={`payment-option-${paymentProviderId}`}
    >
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-x-4">
          <Radio checked={selected} />
          <Text className="text-base-regular">
            {info ? t(`methods.${info.key}`) : paymentProviderId}
          </Text>
        </div>
        <span className="justify-self-end text-ui-fg-base">{info?.icon}</span>
      </div>
      {info?.hasDescription && (
        <Text className="txt-small text-ui-fg-subtle ps-8">
          {t(`methods.${info.key}Description`)}
        </Text>
      )}
      {children}
    </RadioGroupOption>
  )
}

export default PaymentContainer

export const StripePaymentContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  disabled = false,
  setError,
  setPaymentComplete,
}: Omit<PaymentContainerProps, "children"> & {
  setError: (error: string | null) => void
  setPaymentComplete: (complete: boolean) => void
}) => {
  const t = useTranslations("checkout")
  const stripeReady = useContext(StripeContext)

  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      disabled={disabled}
    >
      {selectedPaymentOptionId === paymentProviderId &&
        (stripeReady ? (
          <div className="my-4 transition-all duration-150 ease-in-out">
            <Text className="txt-medium-plus text-ui-fg-base mb-1">
              {t("enterPaymentDetails")}
            </Text>
            <PaymentElement
              options={{ layout: "accordion" }}
              onChange={(e) => {
                setError(null)
                setPaymentComplete(e.complete)
              }}
              onLoadError={(e) => {
                setPaymentComplete(false)
                setError(e.error?.message ?? t("paymentLoadError"))
              }}
            />
          </div>
        ) : (
          <SkeletonCardDetails />
        ))}
    </PaymentContainer>
  )
}
