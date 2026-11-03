"use client"
import { Radio, RadioGroup } from "@headlessui/react"
import { trackCheckoutStepCompleted } from "@lib/analytics/track"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { formatMoney } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import MedusaRadio from "@modules/common/components/radio"
import { Button, clx, Heading, Text } from "@modules/common/components/ui"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

type ShippingOptionWithZone = HttpTypes.StoreCartShippingOption & {
  service_zone?: { fulfillment_set?: { type?: string } }
}

/**
 * Delivery step. Options come from `/store/shipping-options?cart_id`, which
 * Medusa already filters by the address's service zone (governorate), so a
 * Damascus address only sees the Damascus courier option. Pickup-type
 * fulfillment sets are not offered at launch.
 */
const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const t = useTranslations("checkout")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const shippingMethods = (availableShippingMethods ?? []).filter(
    (sm) =>
      (sm as ShippingOptionWithZone).service_zone?.fulfillment_set?.type !==
      "pickup"
  )

  useEffect(() => {
    setIsLoadingPrices(true)

    const promises = shippingMethods
      .filter((sm) => sm.price_type === "calculated")
      .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

    if (!promises.length) {
      setIsLoadingPrices(false)
      return
    }

    Promise.allSettled(promises).then((res) => {
      const pricesMap: Record<string, number> = {}
      res
        .filter((r) => r.status === "fulfilled")
        .forEach((p) => {
          if (p.value?.id) {
            pricesMap[p.value.id] = p.value.amount ?? 0
          }
        })

      setCalculatedPricesMap(pricesMap)
      setIsLoadingPrices(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableShippingMethods])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    trackCheckoutStepCompleted({
      cart_id: cart.id,
      step_name: "delivery",
      governorate: cart.shipping_address?.province ?? null,
      shipping_method:
        shippingMethods.find((option) => option.id === shippingMethodId)
          ?.name ??
        cart.shipping_methods?.at(-1)?.name ??
        null,
    })
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (id: string) => {
    setError(null)

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  const price = (amount: number) =>
    formatMoney(amount, cart.currency_code, locale)

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && cart.shipping_methods?.length === 0,
            }
          )}
        >
          {t("delivery")}
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </Heading>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                data-testid="edit-delivery-button"
              >
                {tc("edit")}
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <>
          <div className="grid">
            <div className="flex flex-col">
              <span className="font-medium txt-medium text-ui-fg-base">
                {t("shippingMethod")}
              </span>
              <span className="mb-4 text-ui-fg-muted txt-medium">
                {t("shippingMethodHint")}
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                {shippingMethods.length === 0 && (
                  <Text
                    className="txt-medium text-ui-fg-subtle"
                    data-testid="no-delivery-options"
                  >
                    {t("noDeliveryToGovernorate")}
                  </Text>
                )}
                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => {
                    if (v) {
                      return handleSetShippingMethod(v)
                    }
                  }}
                >
                  {shippingMethods.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                          {
                            "border-ui-border-interactive":
                              option.id === shippingMethodId,
                            "hover:shadow-brders-none cursor-not-allowed":
                              isDisabled,
                          }
                        )}
                      >
                        <div className="flex items-center gap-x-4">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          <span className="text-base-regular">
                            {option.name}
                          </span>
                        </div>
                        <span className="justify-self-end text-ui-fg-base">
                          {option.price_type === "flat" ? (
                            price(option.amount!)
                          ) : calculatedPricesMap[option.id] ? (
                            price(calculatedPricesMap[option.id])
                          ) : isLoadingPrices ? (
                            <Loader />
                          ) : (
                            "-"
                          )}
                        </span>
                      </Radio>
                    )
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              className="mt"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!cart.shipping_methods?.[0]}
              data-testid="submit-delivery-option-button"
            >
              {t("continueToPayment")}
            </Button>
          </div>
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  {t("method")}
                </Text>
                <Text className="txt-medium text-ui-fg-subtle">
                  {cart.shipping_methods!.at(-1)!.name}{" "}
                  {price(cart.shipping_methods!.at(-1)!.amount!)}
                </Text>
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
