import type { JsonLd as JsonLdData } from "@lib/util/seo"

type JsonLdProps = {
  data: JsonLdData | null | undefined
}

/**
 * Emits one `<script type="application/ld+json">`. `</script>` inside string
 * values is escaped so CMS text can never close the tag early.
 */
const JsonLd = ({ data }: JsonLdProps) => {
  if (!data) {
    return null
  }
  const json = JSON.stringify(data).replace(/</g, "\\u003c")
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}

export default JsonLd
