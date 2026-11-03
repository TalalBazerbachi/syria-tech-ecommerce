import { notFound } from "next/navigation"

/**
 * Any path under a valid locale that no route matched renders the main
 * layout's `not-found.tsx` (nav + footer included) instead of Next's bare
 * default.
 */
export default function CatchAllPage() {
  notFound()
}
