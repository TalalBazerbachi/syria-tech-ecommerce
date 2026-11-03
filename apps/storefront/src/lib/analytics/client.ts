import type { PostHog } from "posthog-js"

/**
 * Thin, lazy wrapper around the posthog-js singleton.
 *
 * `posthog-js` is initialised by `src/instrumentation-client.ts`, which
 * dynamic-imports it on `requestIdleCallback` so the SDK is never in the
 * critical path or in the page bundles. Nothing here imports it statically:
 * any call made before the SDK is up is queued and replayed, with its
 * original timestamp, once it is.
 *
 * Every function is a no-op on the server and when analytics is disabled
 * (no key, or `NEXT_PUBLIC_ANALYTICS_DISABLED=true` / `ANALYTICS_DISABLED=true`).
 */

type Job = (posthog: PostHog) => void

type Status = "pending" | "ready" | "disabled"

const MAX_QUEUE = 100

let status: Status = "pending"
let instance: PostHog | null = null
let queue: Job[] = []

function run(job: Job) {
  if (typeof window === "undefined" || status === "disabled") {
    return
  }
  if (instance) {
    try {
      job(instance)
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[analytics]", err)
      }
    }
    return
  }
  if (queue.length < MAX_QUEUE) {
    queue.push(job)
  }
}

/** Called once `posthog.init` has run. Replays the queue in order. */
export function setAnalyticsInstance(posthog: PostHog) {
  if (instance) {
    return
  }
  instance = posthog
  status = "ready"
  const pending = queue
  queue = []
  for (const job of pending) {
    run(job)
  }
}

/** Called when there is no key or analytics is switched off. */
export function disableAnalytics() {
  status = "disabled"
  queue = []
}

export function isAnalyticsReady() {
  return status === "ready" && instance !== null
}

export function isAnalyticsDisabled() {
  return status === "disabled"
}

/** Runs `job` now if the SDK is loaded, otherwise once it is (never if disabled). */
export function whenAnalyticsReady(job: Job) {
  run(job)
}

export type EventProperties = Record<string, unknown>

/**
 * `posthog.capture` with the call time preserved: an event queued before the
 * SDK loads is sent with the timestamp of the moment it happened.
 */
export function capture(event: string, properties?: EventProperties) {
  const timestamp = new Date()
  run((posthog) => {
    posthog.capture(event, properties, { timestamp })
  })
}

/** Super properties (sent with every later event). */
export function register(properties: EventProperties) {
  run((posthog) => {
    posthog.register(properties)
  })
}

export function identify(
  distinctId: string,
  set?: EventProperties,
  setOnce?: EventProperties
) {
  run((posthog) => {
    if (posthog.get_distinct_id() === distinctId) {
      return
    }
    posthog.identify(distinctId, set, setOnce)
  })
}

export function setPersonProperties(
  set?: EventProperties,
  setOnce?: EventProperties
) {
  run((posthog) => {
    posthog.setPersonProperties(set, setOnce)
  })
}

export function reset() {
  run((posthog) => {
    posthog.reset()
  })
}

/** Synchronous: `null` until the SDK has loaded. */
export function getDistinctId(): string | null {
  if (!instance) {
    return null
  }
  try {
    return instance.get_distinct_id() ?? null
  } catch {
    return null
  }
}
