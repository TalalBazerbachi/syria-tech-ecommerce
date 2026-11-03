import { Text, clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

export default function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <>
      {price.price_type === "sale" && (
        <Text
          as="span"
          className="line-through text-ui-fg-muted"
          data-testid="original-price"
        >
          <bdi>{price.original_price}</bdi>
        </Text>
      )}
      <Text
        as="span"
        className={clx("text-ui-fg-muted", {
          "text-ui-fg-interactive": price.price_type === "sale",
        })}
        data-testid="price"
      >
        <bdi>{price.calculated_price}</bdi>
      </Text>
    </>
  )
}
