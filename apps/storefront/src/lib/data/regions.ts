"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { cache } from "react"
import { getCacheOptions } from "./cookies"

/** The one country this store ships to. The region owning it is "the" region. */
const STORE_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "sy").toLowerCase()

export const listRegions = async () => {
  const next = {
    ...(await getCacheOptions("regions")),
  }

  return await sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  }

  return await sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
}

/**
 * Resolves the store's region server-side: the region whose countries include
 * `sy`, falling back to the first region the backend returns (a second,
 * country-less SYP region can exist later without changing this code).
 * Memoised per request with React `cache`.
 */
export const getRegion = cache(
  async (): Promise<HttpTypes.StoreRegion | null> => {
    const regions = await listRegions().catch(() => null)

    if (!regions?.length) {
      return null
    }

    const byCountry = regions.find((region) =>
      region.countries?.some(
        (country) => country.iso_2?.toLowerCase() === STORE_COUNTRY
      )
    )

    return byCountry ?? regions[0]
  }
)
