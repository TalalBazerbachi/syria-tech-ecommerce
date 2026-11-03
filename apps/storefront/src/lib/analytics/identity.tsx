"use client"

import { useEffect } from "react"

import { identify } from "./client"

export type IdentifiedCustomer = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
}

/**
 * `posthog.identify(customer.id, { email, first_name, last_name })` for the
 * signed-in customer. Mounted in the store layout, so it covers login and
 * signup (the layout re-renders with the customer) as well as returning
 * sessions; `identify` is skipped when the distinct id already matches.
 * `posthog.reset()` on logout lives in the account nav's logout handler.
 */
export function CustomerIdentity({
  customer,
}: {
  customer: IdentifiedCustomer | null
}) {
  const id = customer?.id ?? null
  const email = customer?.email ?? null
  const firstName = customer?.first_name ?? null
  const lastName = customer?.last_name ?? null

  useEffect(() => {
    if (!id) return
    identify(id, { email, first_name: firstName, last_name: lastName })
  }, [id, email, firstName, lastName])

  return null
}
