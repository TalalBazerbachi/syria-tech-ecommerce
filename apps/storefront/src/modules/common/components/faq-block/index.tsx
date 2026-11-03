import type { FaqItem } from "@lib/data/cms"
import { Heading } from "@modules/common/components/ui"

type FaqBlockProps = {
  items: FaqItem[]
  heading: string
  className?: string
}

/**
 * FAQ list rendered as native `<details>` so it works without JavaScript and
 * stays crawlable. Pair it with `faqJsonLd(items)` for the `FAQPage` schema.
 */
const FaqBlock = ({ items, heading, className }: FaqBlockProps) => {
  if (!items.length) {
    return null
  }

  return (
    <section
      className={className ?? "max-w-3xl mx-auto flex flex-col gap-y-4"}
      data-testid="faq-block"
    >
      <Heading level="h2" className="text-2xl-regular text-ui-fg-base">
        {heading}
      </Heading>
      <div className="flex flex-col divide-y divide-ui-border-base border-y border-ui-border-base">
        {items.map((item, index) => (
          <details key={`${index}-${item.question}`} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base-semi text-ui-fg-base [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="shrink-0 text-ui-fg-muted transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div
              className="cms-prose pt-2 pb-1"
              dangerouslySetInnerHTML={{ __html: item.answerHtml }}
            />
          </details>
        ))}
      </div>
    </section>
  )
}

export default FaqBlock
