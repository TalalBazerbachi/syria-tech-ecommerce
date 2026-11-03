import "server-only"

import { marked } from "marked"
import sanitizeHtml from "sanitize-html"

/**
 * The one place untrusted rich text (Medusa product descriptions, Strapi
 * richtext, repo markdown files) becomes HTML. Everything goes through
 * `marked` (GFM) and then `sanitize-html` with a strict allow-list, so a
 * compromised CMS or a stray `<script>` in a product description cannot run
 * in the storefront.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "strong", "em", "b", "i", "u", "s",
    "ul", "ol", "li", "blockquote", "code", "pre", "a", "img",
    "table", "thead", "tbody", "tr", "th", "td", "span",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    span: ["dir"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // Relative links (`/ar/pages/warranty`) and anchors are fine.
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
    // `# Title` inside body copy would compete with the page's own <h1>.
    h1: "h2",
  },
}

export function markdownToSafeHtml(markdown: string | null | undefined): string | null {
  if (typeof markdown !== "string" || !markdown.trim()) {
    return null
  }
  const html = marked.parse(markdown, { async: false, gfm: true }) as string
  const safe = sanitizeHtml(html, SANITIZE_OPTIONS).trim()
  return safe || null
}

/** Plain text (no tags) for meta descriptions, capped to `max` characters. */
export function markdownToPlainText(
  markdown: string | null | undefined,
  max = 160
): string | null {
  const html = markdownToSafeHtml(markdown)
  if (!html) {
    return null
  }
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
  if (!text) {
    return null
  }
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/* ----------------------------------------------------------------------------
 * Strapi "blocks" rich text. The spec says the fields are markdown
 * (`richtext`), but a `blocks` field is a one-click alternative in the Strapi
 * admin, so a JSON array is converted too rather than rendered as nothing.
 * ------------------------------------------------------------------------- */

type BlockNode = {
  type?: string
  level?: number
  format?: "ordered" | "unordered"
  url?: string
  text?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  image?: { url?: string; alternativeText?: string | null }
  children?: BlockNode[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderInline(nodes: BlockNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === "link") {
        return `<a href="${escapeHtml(node.url ?? "")}">${renderInline(node.children)}</a>`
      }
      let text = escapeHtml(node.text ?? "")
      if (node.code) text = `<code>${text}</code>`
      if (node.bold) text = `<strong>${text}</strong>`
      if (node.italic) text = `<em>${text}</em>`
      if (node.underline) text = `<u>${text}</u>`
      if (node.strikethrough) text = `<s>${text}</s>`
      return text
    })
    .join("")
}

function renderBlock(node: BlockNode): string {
  switch (node.type) {
    case "heading": {
      const level = Math.min(Math.max(node.level ?? 2, 2), 4)
      return `<h${level}>${renderInline(node.children)}</h${level}>`
    }
    case "list": {
      const tag = node.format === "ordered" ? "ol" : "ul"
      const items = (node.children ?? [])
        .map((item) =>
          item.type === "list"
            ? renderBlock(item)
            : `<li>${renderInline(item.children)}</li>`
        )
        .join("")
      return `<${tag}>${items}</${tag}>`
    }
    case "quote":
      return `<blockquote><p>${renderInline(node.children)}</p></blockquote>`
    case "code":
      return `<pre><code>${renderInline(node.children)}</code></pre>`
    case "image":
      return node.image?.url
        ? `<p><img src="${escapeHtml(node.image.url)}" alt="${escapeHtml(node.image.alternativeText ?? "")}" /></p>`
        : ""
    case "paragraph":
    default:
      return `<p>${renderInline(node.children)}</p>`
  }
}

/**
 * Accepts whatever a Strapi rich field returns (markdown string or blocks
 * array) and yields sanitised HTML, or `null` when empty.
 */
export function richTextToSafeHtml(value: unknown): string | null {
  if (typeof value === "string") {
    return markdownToSafeHtml(value)
  }
  if (Array.isArray(value)) {
    const html = (value as BlockNode[]).map(renderBlock).join("")
    const safe = sanitizeHtml(html, SANITIZE_OPTIONS).trim()
    return safe || null
  }
  return null
}
