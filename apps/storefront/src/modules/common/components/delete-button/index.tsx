import { trackProductRemoved } from "@lib/analytics/track"
import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import { useState } from "react"

const DeleteButton = ({
  id,
  item,
  cart,
  children,
  className,
}: {
  id: string
  /** With `cart`, a successful delete fires `Product Removed`. */
  item?: HttpTypes.StoreCartLineItem
  cart?: Pick<HttpTypes.StoreCart, "id" | "currency_code"> | null
  children?: React.ReactNode
  className?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    await deleteLineItem(id)
      .then(() => {
        if (item && cart) {
          trackProductRemoved(item, cart)
        }
      })
      .catch((_err) => {
        setIsDeleting(false)
      })
  }

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className
      )}
    >
      <button
        className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
        onClick={() => handleDelete(id)}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton
