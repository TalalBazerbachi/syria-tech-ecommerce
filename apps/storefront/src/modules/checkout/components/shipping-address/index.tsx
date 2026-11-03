"use client"

import { addressNotes } from "@lib/util/address"
import { HttpTypes } from "@medusajs/types"
import AddressFields from "@modules/checkout/components/address-fields"
import Input from "@modules/common/components/input"
import { Container } from "@modules/common/components/ui"
import { useTranslations } from "next-intl"
import React, { useEffect, useState } from "react"
import AddressSelect from "../address-select"

const PREFIX = "shipping_address."

const toFormValues = (
  address: HttpTypes.StoreCartAddress | HttpTypes.StoreCustomerAddress | null | undefined
) => ({
  [`${PREFIX}first_name`]: address?.first_name || "",
  [`${PREFIX}last_name`]: address?.last_name || "",
  [`${PREFIX}phone`]: address?.phone || "",
  [`${PREFIX}province`]: address?.province?.toLowerCase() || "",
  [`${PREFIX}city`]: address?.city || "",
  [`${PREFIX}address_1`]: address?.address_1 || "",
  [`${PREFIX}address_2`]: address?.address_2 || "",
  [`${PREFIX}notes`]: addressNotes(address) || "",
})

const ShippingAddress = ({
  customer,
  cart,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
}) => {
  const t = useTranslations("address")
  const [formData, setFormData] = useState<Record<string, string>>({
    ...toFormValues(cart?.shipping_address),
    email: cart?.email || "",
  })

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    if (address) {
      setFormData((prevState) => ({ ...prevState, ...toFormValues(address) }))
    }

    if (email) {
      setFormData((prevState) => ({ ...prevState, email }))
    }
  }

  useEffect(() => {
    if (cart && cart.shipping_address) {
      setFormAddress(cart.shipping_address, cart.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const savedAddresses = customer?.addresses ?? []

  return (
    <>
      {customer && savedAddresses.length > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-5">
          <p className="text-small-regular">
            {t("useSavedAddress", { name: customer.first_name ?? "" })}
          </p>
          <AddressSelect
            addresses={savedAddresses}
            addressInput={
              Object.fromEntries(
                Object.entries(formData).map(([key, value]) => [
                  key.replace(PREFIX, ""),
                  value,
                ])
              ) as unknown as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}

      <AddressFields
        prefix={PREFIX}
        values={formData}
        onChange={handleChange}
        testIdPrefix="shipping"
      />

      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4 mt-4 mb-4">
        {/* Optional: many cash-on-delivery customers have no email; the phone is the contact. */}
        <Input
          label={t("emailOptional")}
          name="email"
          type="email"
          dir="ltr"
          title={t("emailHint")}
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          data-testid="shipping-email-input"
        />
      </div>
    </>
  )
}

export default ShippingAddress
