import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account")
  return {
    title: t("title"),
    description: t("overviewMeta"),
  }
}

export default async function OverviewTemplate() {
  const customer = await retrieveCustomer().catch(() => null)
  const orders = (await listOrders().catch(() => null)) || null

  if (!customer) {
    notFound()
  }

  return <Overview customer={customer} orders={orders} />
}
