"use client"

import { Link } from "@i18n/navigation"
import React from "react"

/**
 * A `<Link />` that keeps the current locale prefix (`/ar/...`, `/en/...`)
 * without callers having to pass it. Thin wrapper over next-intl's `Link`.
 */
const LocalizedClientLink = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: () => void
  passHref?: true
  [x: string]: unknown
}) => {
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
