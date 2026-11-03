import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import OrderOverview from "@modules/account/components/order-overview"
import { listOrders } from "@lib/data/orders"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account")
  return {
    title: t("orders"),
    description: t("ordersMeta"),
  }
}

export default async function Orders() {
  const t = await getTranslations("account")
  const orders = await listOrders().catch(() => null)

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("orders")}</h1>
        <p className="text-base-regular">{t("ordersIntro")}</p>
      </div>
      <div>
        <OrderOverview orders={orders} />
      </div>
    </div>
  )
}
