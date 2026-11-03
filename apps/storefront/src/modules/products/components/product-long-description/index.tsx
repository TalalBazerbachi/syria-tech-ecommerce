import { Heading } from "@modules/common/components/ui"
import { useTranslations } from "next-intl"

type ProductLongDescriptionProps = {
  /** Already sanitised in `lib/data/cms.ts` (markdown -> HTML -> sanitize-html). */
  html: string
}

/** Long-form product content from Strapi, rendered below the gallery. */
const ProductLongDescription = ({ html }: ProductLongDescriptionProps) => {
  const t = useTranslations("product")

  return (
    <section
      className="max-w-3xl mx-auto flex flex-col gap-y-6"
      data-testid="product-long-description"
    >
      <Heading level="h2" className="text-2xl-regular text-ui-fg-base">
        {t("aboutThisProduct")}
      </Heading>
      <div className="cms-prose" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  )
}

export default ProductLongDescription
