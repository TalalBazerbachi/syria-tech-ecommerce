import { HttpTypes } from "@medusajs/types"
import { getGovernorate, STORE_COUNTRY_CODE } from "@lib/data/governorates"
import { normalizeSyrianPhone } from "./phone"

/**
 * The storefront's address form, mapped onto Medusa's address fields
 * (docs/architecture.md, "Address form → Medusa address fields"):
 *
 * | form field            | Medusa field      |
 * | --------------------- | ----------------- |
 * | phone (09XXXXXXXX)    | phone (+9639…)    |
 * | governorate           | province (sy-di)  |
 * | city / area           | city              |
 * | street / building     | address_1         |
 * | nearest landmark      | address_2         |
 * | delivery notes        | metadata.notes    |
 * | —                     | country_code = sy |
 * | —                     | postal_code never |
 */
export const ADDRESS_FIELDS = [
  "first_name",
  "last_name",
  "phone",
  "province",
  "city",
  "address_1",
  "address_2",
  "notes",
] as const

export type AddressFieldName = (typeof ADDRESS_FIELDS)[number]

export type AddressFormError =
  | { field: "phone"; code: "phoneInvalid" }
  | { field: "province"; code: "governorateInvalid" }
  | { field: "city"; code: "cityRequired" }
  | { field: "first_name" | "last_name"; code: "nameRequired" }

export type MedusaAddressInput = {
  first_name: string
  last_name: string
  phone: string
  province: string
  city: string
  address_1: string
  address_2: string
  country_code: string
  postal_code: string
  company: string
  metadata?: Record<string, unknown>
}

type ParseResult =
  | { ok: true; address: MedusaAddressInput }
  | { ok: false; error: AddressFormError }

const read = (formData: FormData, prefix: string, name: string) =>
  String(formData.get(`${prefix}${name}`) ?? "").trim()

/**
 * Reads the address fields (optionally prefixed, e.g. `shipping_address.`)
 * from a submitted form and returns a Medusa address or the first validation
 * error. Province is always lowercase, phone always E.164, country always `sy`.
 */
export function parseAddressForm(formData: FormData, prefix = ""): ParseResult {
  const first_name = read(formData, prefix, "first_name")
  const last_name = read(formData, prefix, "last_name")
  if (!first_name) {
    return { ok: false, error: { field: "first_name", code: "nameRequired" } }
  }
  if (!last_name) {
    return { ok: false, error: { field: "last_name", code: "nameRequired" } }
  }

  const phone = normalizeSyrianPhone(read(formData, prefix, "phone"))
  if (!phone) {
    return { ok: false, error: { field: "phone", code: "phoneInvalid" } }
  }

  const governorate = getGovernorate(read(formData, prefix, "province"))
  if (!governorate) {
    return { ok: false, error: { field: "province", code: "governorateInvalid" } }
  }

  const city = read(formData, prefix, "city")
  if (!city) {
    return { ok: false, error: { field: "city", code: "cityRequired" } }
  }

  const notes = read(formData, prefix, "notes")

  return {
    ok: true,
    address: {
      first_name,
      last_name,
      phone,
      province: governorate.code,
      city,
      address_1: read(formData, prefix, "address_1"),
      address_2: read(formData, prefix, "address_2"),
      country_code: STORE_COUNTRY_CODE,
      postal_code: "",
      company: "",
      ...(notes ? { metadata: { notes } } : {}),
    },
  }
}

type AnyAddress =
  | HttpTypes.StoreCartAddress
  | HttpTypes.StoreCustomerAddress
  | HttpTypes.StoreOrderAddress
  | null
  | undefined

/** Delivery notes stored on `metadata.notes`, if any. */
export function addressNotes(address: AnyAddress): string | null {
  const notes = (address?.metadata as Record<string, unknown> | null | undefined)?.notes
  return typeof notes === "string" && notes.trim() ? notes : null
}
