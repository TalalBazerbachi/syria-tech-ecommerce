import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account")
  return {
    title: t("addresses"),
    description: t("addressesMeta"),
  }
}

export default async function Addresses() {
  const t = await getTranslations("account")
  const customer = await retrieveCustomer()
  const region = await getRegion()

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("shippingAddresses")}</h1>
        <p className="text-base-regular">{t("addressesIntro")}</p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
