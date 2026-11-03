"use client"
import { RadioGroup } from "@headlessui/react"
import {
  paymentMethodKey,
  trackCheckoutStepCompleted,
} from "@lib/analytics/track"
import { getPaymentInfo, isStripeLike } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { CheckCircleSolid } from "@medusajs/icons"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripePaymentContainer,
} from "@modules/checkout/components/payment-container"
import Divider from "@modules/common/components/divider"
import {
  Button,
  Container,
  Heading,
  Text,
  clx,
} from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

/**
 * Payment step. `availablePaymentMethods` is what `/store/payment-providers`
 * returns for the region, so when cash on delivery is the only enabled
 * provider it is the only option rendered — and it is pre-selected.
 */
const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
}) => {
  const t = useTranslations("checkout")
  const tc = useTranslations("common")
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending"
  )

  const onlyMethod =
    availablePaymentMethods.length === 1 ? availablePaymentMethods[0].id : ""

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? onlyMethod
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
    if (isStripeLike(method)) {
      await initiatePaymentSession(cart, {
        provider_id: method,
      })
    }
  }

  const paymentReady =
    !!activeSession && (cart?.shipping_methods?.length ?? 0) !== 0

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const shouldInputPaymentDetails =
        isStripeLike(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
      }

      if (!shouldInputPaymentDetails) {
        trackCheckoutStepCompleted({
          cart_id: cart.id,
          step_name: "payment",
          governorate: cart.shipping_address?.province ?? null,
          shipping_method: cart.shipping_methods?.at(-1)?.name ?? null,
          payment_method: paymentMethodKey(selectedPaymentMethod),
        })
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          }
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  const activeInfo = getPaymentInfo(activeSession?.provider_id)

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && !paymentReady,
            }
          )}
        >
          {t("payment")}
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-payment-button"
            >
              {tc("edit")}
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {availablePaymentMethods.length > 0 ? (
            <RadioGroup
              value={selectedPaymentMethod}
              onChange={(value: string) => setPaymentMethod(value)}
            >
              {availablePaymentMethods.map((paymentMethod) => (
                <div key={paymentMethod.id}>
                  {isStripeLike(paymentMethod.id) ? (
                    <StripePaymentContainer
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                      setError={setError}
                      setPaymentComplete={setPaymentComplete}
                    />
                  ) : (
                    <PaymentContainer
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                    />
                  )}
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Text className="txt-medium text-ui-fg-subtle">
              {t("noPaymentMethods")}
            </Text>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (isStripeLike(selectedPaymentMethod) && !paymentComplete) ||
              !selectedPaymentMethod
            }
            data-testid="submit-payment-button"
          >
            {!activeSession && isStripeLike(selectedPaymentMethod)
              ? t("enterPaymentDetails")
              : t("continueToReview")}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex flex-col xsmall:flex-row items-start gap-x-1 gap-y-4 w-full">
              <div className="flex flex-col xsmall:w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  {t("paymentMethod")}
                </Text>
                <Text
                  className="txt-medium text-ui-fg-subtle"
                  data-testid="payment-method-summary"
                >
                  {activeInfo
                    ? t(`methods.${activeInfo.key}`)
                    : activeSession.provider_id}
                </Text>
              </div>
              <div className="flex flex-col xsmall:w-2/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  {t("paymentDetails")}
                </Text>
                <div
                  className="flex gap-2 txt-medium text-ui-fg-subtle items-center"
                  data-testid="payment-details-summary"
                >
                  {activeInfo && (
                    <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                      {activeInfo.icon}
                    </Container>
                  )}
                  <Text>
                    {activeInfo?.hasDescription
                      ? t(`methods.${activeInfo.key}Description`)
                      : t("anotherStepWillAppear")}
                  </Text>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment
