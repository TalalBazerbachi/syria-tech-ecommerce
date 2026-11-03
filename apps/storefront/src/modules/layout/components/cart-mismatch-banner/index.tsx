"use client"

import { transferCart } from "@lib/data/customer"
import { ExclamationCircleSolid } from "@medusajs/icons"
import { StoreCart, StoreCustomer } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import { useTranslations } from "next-intl"
import { useState } from "react"

function CartMismatchBanner(props: {
  customer: StoreCustomer
  cart: StoreCart
}) {
  const t = useTranslations("cart")
  const { customer, cart } = props
  const [isPending, setIsPending] = useState(false)

  if (!customer || !!cart.customer_id) {
    return
  }

  const handleSubmit = async () => {
    try {
      setIsPending(true)
      await transferCart()
    } catch {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center justify-center small:p-4 p-2 text-center bg-orange-300 small:gap-2 gap-1 text-sm mt-2 text-orange-800">
      <div className="flex flex-col small:flex-row small:gap-2 gap-1 items-center">
        <span className="flex items-center gap-1">
          <ExclamationCircleSolid className="inline" />
          {t("transferFailed")}
        </span>

        <span>·</span>

        <Button
          variant="transparent"
          className="hover:bg-transparent active:bg-transparent focus:bg-transparent disabled:text-orange-500 text-orange-950 p-0 bg-transparent"
          size="medium"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending ? t("transferring") : t("retryTransfer")}
        </Button>
      </div>
    </div>
  )
}

export default CartMismatchBanner
