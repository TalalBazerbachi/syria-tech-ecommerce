import { clx } from "@modules/common/components/ui"

type ProseProps = {
  /** Already sanitised HTML (see `lib/util/markdown.ts`). Never raw CMS text. */
  html: string
  className?: string
  "data-testid"?: string
}

/** Styled container for sanitised rich text (`.cms-prose` in globals.css). */
const Prose = ({ html, className, "data-testid": testId }: ProseProps) => (
  <div
    className={clx("cms-prose", className)}
    data-testid={testId}
    dangerouslySetInnerHTML={{ __html: html }}
  />
)

export default Prose
