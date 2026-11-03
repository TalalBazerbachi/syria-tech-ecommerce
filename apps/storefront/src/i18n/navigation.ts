import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

/**
 * Locale-aware `Link`, `redirect`, `usePathname`, `useRouter` and
 * `getPathname`. `Link` keeps the current locale prefix, `usePathname`
 * returns the path *without* it.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
