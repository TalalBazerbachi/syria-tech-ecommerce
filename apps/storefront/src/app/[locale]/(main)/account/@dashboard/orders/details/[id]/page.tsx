import { retrieveOrder } from "@lib/data/orders"
import OrderDetailsTemplate from "@modules/order/templates/order-details-template"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const t = await getTranslations("order")
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    notFound()
  }

  return {
    title: t("orderNumberTitle", { number: order.display_id ?? "" }),
    description: t("detailsMeta"),
  }
}

export default async function OrderDetailPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    notFound()
  }

  return <OrderDetailsTemplate order={order} />
}
