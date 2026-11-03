"use client"

import { STORE_COUNTRY_CODE } from "@lib/data/governorates"
import { addressNotes } from "@lib/util/address"
import { formatSyrianPhone } from "@lib/util/phone"
import { HttpTypes } from "@medusajs/types"
import GovernorateSelect from "@modules/checkout/components/governorate-select"
import Input from "@modules/common/components/input"
import Textarea from "@modules/common/components/textarea"
import { useTranslations } from "next-intl"
import React from "react"

type AnyAddress =
  | HttpTypes.StoreCartAddress
  | HttpTypes.StoreCustomerAddress
  | null
  | undefined

type AddressFieldsProps = {
  /** Field-name prefix, e.g. `shipping_address.` (checkout) or `` (account). */
  prefix?: string
  /** Controlled values (checkout form); when omitted the fields are uncontrolled. */
  values?: Record<string, string>
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  /** Initial values for the uncontrolled variant (account address cards). */
  address?: AnyAddress
  testIdPrefix?: string
}

/**
 * The Syrian delivery address, per docs/architecture.md: phone (09…),
 * governorate, city/area, street & building, nearest landmark, delivery
 * notes. Country is fixed to `sy`; there is no postal code.
 */
const AddressFields = ({
  prefix = "",
  values,
  onChange,
  address,
  testIdPrefix = "address",
}: AddressFieldsProps) => {
  const t = useTranslations("address")

  const field = (name: string) => `${prefix}${name}`
  const controlled = values !== undefined

  const valueProps = (name: string, fallback?: string | null) =>
    controlled
      ? { value: values?.[field(name)] ?? "", onChange }
      : { defaultValue: fallback || undefined }

  return (
    <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
      <Input
        label={t("firstName")}
        name={field("first_name")}
        autoComplete="given-name"
        required
        data-testid={`${testIdPrefix}-first-name-input`}
        {...valueProps("first_name", address?.first_name)}
      />
      <Input
        label={t("lastName")}
        name={field("last_name")}
        autoComplete="family-name"
        required
        data-testid={`${testIdPrefix}-last-name-input`}
        {...valueProps("last_name", address?.last_name)}
      />
      <Input
        label={t("phone")}
        name={field("phone")}
        type="tel"
        inputMode="tel"
        dir="ltr"
        autoComplete="tel"
        title={t("phoneHint")}
        required
        data-testid={`${testIdPrefix}-phone-input`}
        {...valueProps(
          "phone",
          address?.phone ? formatSyrianPhone(address.phone) : undefined
        )}
      />
      <GovernorateSelect
        name={field("province")}
        autoComplete="address-level1"
        required
        data-testid={`${testIdPrefix}-governorate-select`}
        {...valueProps("province", address?.province?.toLowerCase())}
      />
      <Input
        label={t("city")}
        name={field("city")}
        autoComplete="address-level2"
        required
        data-testid={`${testIdPrefix}-city-input`}
        {...valueProps("city", address?.city)}
      />
      <Input
        label={t("street")}
        name={field("address_1")}
        autoComplete="address-line1"
        data-testid={`${testIdPrefix}-street-input`}
        {...valueProps("address_1", address?.address_1)}
      />
      <div className="xsmall:col-span-2">
        <Input
          label={t("landmark")}
          name={field("address_2")}
          autoComplete="address-line2"
          data-testid={`${testIdPrefix}-landmark-input`}
          {...valueProps("address_2", address?.address_2)}
        />
      </div>
      <div className="xsmall:col-span-2">
        <Textarea
          label={t("notes")}
          name={field("notes")}
          rows={2}
          data-testid={`${testIdPrefix}-notes-input`}
          {...valueProps("notes", addressNotes(address))}
        />
      </div>
      <input type="hidden" name={field("country_code")} value={STORE_COUNTRY_CODE} />
    </div>
  )
}

export default AddressFields
