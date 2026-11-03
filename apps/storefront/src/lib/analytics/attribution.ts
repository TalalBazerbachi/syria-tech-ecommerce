import { capture } from "./client"

/**
 * Attribution, per docs/analytics.md ("Attribution (ads and creators)").
 *
 * - Creator links: `?ref=<code>` (also `utm_source=creator&utm_campaign=<code>`)
 *   fire `Creator Link Visited`, set `first_creator` (once) / `last_creator`
 *   on the person, and keep the code in the first-party cookie `creator_ref`
 *   for 30 days. The cookie is *first touch*: a later creator link does not
 *   overwrite an unexpired cookie, so the cookie and the payout rule ("first
 *   touch within 30 days") agree.
 * - The first landing (URL + referrer + time) is snapshotted in localStorage.
 *   posthog-js keeps its own `$initial_*` person properties, but those are
 *   only materialised on the person, not readable here, so the storefront
 *   keeps its own copy and builds `metadata.attribution` for the cart from it.
 *   Promo-code-based creator attribution is resolved server-side.
 */

export const CREATOR_COOKIE = "creator_ref"
const CREATOR_COOKIE_DAYS = 30
const FIRST_TOUCH_KEY = "st_first_touch"

/** Creator codes are promo-code-like: letters, digits, `_`, `-`. */
const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/

export type Attribution = {
  creator: string | null
  creator_source: "link" | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  fbclid: string | null
  ttclid: string | null
  landing_path: string | null
  referrer: string | null
  landed_at: string | null
}

export const ATTRIBUTION_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "ttclid",
] as const

/** The creator code carried by a landing URL, if any. */
export function readCreatorFromSearch(search: URLSearchParams): string | null {
  const ref = search.get("ref")?.trim()
  if (ref && CODE_RE.test(ref)) {
    return ref
  }
  if (search.get("utm_source")?.trim().toLowerCase() === "creator") {
    const campaign = search.get("utm_campaign")?.trim()
    if (campaign && CODE_RE.test(campaign)) {
      return campaign
    }
  }
  return null
}

export function getCreatorCookie(): string | null {
  if (typeof document === "undefined") {
    return null
  }
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${CREATOR_COOKIE}=`))
  if (!match) {
    return null
  }
  const value = decodeURIComponent(match.slice(CREATOR_COOKIE.length + 1))
  return CODE_RE.test(value) ? value : null
}

/** Sets the 30-day first-touch cookie unless an unexpired one already exists. */
export function setCreatorCookieOnce(code: string) {
  if (typeof document === "undefined" || getCreatorCookie()) {
    return
  }
  const maxAge = CREATOR_COOKIE_DAYS * 24 * 60 * 60
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${CREATOR_COOKIE}=${encodeURIComponent(
    code
  )}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`
}

/**
 * `Creator Link Visited` plus the person properties: `$set_once` keeps the
 * first creator, `$set` the latest. `person_profiles: "always"` makes this
 * stick on anonymous visitors too.
 */
export function trackCreatorLinkVisited(code: string) {
  const at = new Date().toISOString()
  capture("Creator Link Visited", {
    creator: code,
    $set_once: { first_creator: code, first_creator_at: at },
    $set: { last_creator: code, last_creator_at: at },
  })
}

type FirstTouch = { u: string; r: string; t: string }

/** Snapshot of the first landing: URL, referrer, time. Written once. */
export function recordFirstTouch() {
  if (typeof window === "undefined") {
    return
  }
  try {
    if (window.localStorage.getItem(FIRST_TOUCH_KEY)) {
      return
    }
    const record: FirstTouch = {
      u: window.location.href,
      r: document.referrer || "",
      t: new Date().toISOString(),
    }
    window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(record))
  } catch {
    // Storage unavailable (private mode, quota): the cart gets creator + nulls.
  }
}

function readFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    const raw = window.localStorage.getItem(FIRST_TOUCH_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<FirstTouch>
    return { u: parsed.u ?? "", r: parsed.r ?? "", t: parsed.t ?? "" }
  } catch {
    return null
  }
}

const clip = (value: string | null | undefined, max = 500) =>
  value ? value.slice(0, max) : null

/** The `attribution` block written to `cart.metadata.attribution`. */
export function buildAttribution(): Attribution {
  const creator = getCreatorCookie()
  const touch = readFirstTouch()

  let landing: URL | null = null
  if (touch?.u) {
    try {
      landing = new URL(touch.u)
    } catch {
      landing = null
    }
  }

  const attribution: Attribution = {
    creator,
    creator_source: creator ? "link" : null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    gclid: null,
    gbraid: null,
    wbraid: null,
    fbclid: null,
    ttclid: null,
    landing_path: landing ? clip(landing.pathname + landing.search, 1000) : null,
    referrer: clip(touch?.r, 1000),
    landed_at: touch?.t || null,
  }

  if (landing) {
    for (const key of ATTRIBUTION_PARAM_KEYS) {
      attribution[key] = clip(landing.searchParams.get(key))
    }
  }

  return attribution
}
