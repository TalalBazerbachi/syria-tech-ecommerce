import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart")
  return {
    title: t("title"),
    description: t("metaDescription"),
  }
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  return <CartTemplate cart={cart} customer={customer} />
}
