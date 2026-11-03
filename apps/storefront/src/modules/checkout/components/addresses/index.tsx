"use client"
import { trackCheckoutStepCompleted } from "@lib/analytics/track"
import { setAddresses } from "@lib/data/cart"
import { governorateName } from "@lib/data/governorates"
import { addressNotes } from "@lib/util/address"
import { formatSyrianPhone } from "@lib/util/phone"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import Divider from "@modules/common/components/divider"
import { Heading, Text } from "@modules/common/components/ui"
import Spinner from "@modules/common/icons/spinner"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const t = useTranslations("checkout")
  const ta = useTranslations("address")
  const tc = useTranslations("common")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  // `setAddresses` returns an error string, or redirects to the delivery step
  // on success (the awaited action then resolves without a value).
  const [message, formAction] = useActionState(
    async (state: unknown, formData: FormData) => {
      const result = await setAddresses(state, formData)
      if (!result && cart) {
        trackCheckoutStepCompleted({
          cart_id: cart.id,
          step_name: "address",
          governorate:
            String(formData.get("shipping_address.province") ?? "")
              .trim()
              .toLowerCase() || null,
        })
      }
      return result
    },
    null
  )

  const address = cart?.shipping_address
  const notes = addressNotes(address)

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
        >
          {t("deliveryAddress")}
          {!isOpen && <CheckCircleSolid />}
        </Heading>
        {!isOpen && cart?.shipping_address && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-address-button"
            >
              {tc("edit")}
            </button>
          </Text>
        )}
      </div>
      {isOpen ? (
        <form action={formAction}>
          <div className="pb-8">
            <ShippingAddress customer={customer} cart={cart} />
            <SubmitButton className="mt-6" data-testid="submit-address-button">
              {t("continueToDelivery")}
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && address ? (
              <div className="flex flex-col xsmall:flex-row items-start gap-x-8 gap-y-4">
                <div
                  className="flex flex-col xsmall:w-1/2"
                  data-testid="shipping-address-summary"
                >
                  <Text className="txt-medium-plus text-ui-fg-base mb-1">
                    {t("deliveryAddress")}
                  </Text>
                  <Text className="txt-medium text-ui-fg-subtle">
                    {address.first_name} {address.last_name}
                  </Text>
                  <Text className="txt-medium text-ui-fg-subtle">
                    {governorateName(address.province, locale)}
                    {address.city && `, ${address.city}`}
                  </Text>
                  {address.address_1 && (
                    <Text className="txt-medium text-ui-fg-subtle">
                      {address.address_1}
                    </Text>
                  )}
                  {address.address_2 && (
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
                  className="flex flex-col xsmall:w-1/2"
                  data-testid="shipping-contact-summary"
                >
                  <Text className="txt-medium-plus text-ui-fg-base mb-1">
                    {t("contact")}
                  </Text>
                  <Text className="txt-medium text-ui-fg-subtle" dir="ltr">
                    {formatSyrianPhone(address.phone)}
                  </Text>
                  <Text className="txt-medium text-ui-fg-subtle" dir="ltr">
                    {cart.email}
                  </Text>
                </div>
              </div>
            ) : (
              <div>
                <Spinner />
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Addresses
