import "server-only"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"

import { getCollectionByHandle } from "./collections"
import { getCacheOptions } from "./cookies"
import { listProducts } from "./products"
import { getRegion } from "./regions"

/**
 * Catalogue lookups that join CMS content to Medusa *by handle* (the only
 * contract between the two systems) plus the cheap handle listings the
 * sitemap needs. Every function swallows errors: a Medusa hiccup must not
 * take a guide or the sitemap down.
 */

const PAGE = 100

type HandleRow = { handle: string; updated_at?: string | null }

async function pageThrough<T extends HandleRow>(
  path: string,
  key: string,
  extraQuery: Record<string, unknown> = {}
): Promise<T[]> {
  const rows: T[] = []
  const next = { ...(await getCacheOptions("sitemap")) }
  for (let offset = 0; offset < 5000; offset += PAGE) {
    try {
      const json = await sdk.client.fetch<Record<string, unknown>>(path, {
        query: { fields: "handle,updated_at", limit: PAGE, offset, ...extraQuery },
        next: { ...next, revalidate: 300 },
        cache: "force-cache",
      })
      const batch = (json[key] as T[] | undefined) ?? []
      rows.push(...batch.filter((row) => !!row.handle))
      const count = typeof json.count === "number" ? json.count : rows.length
      if (batch.length < PAGE || rows.length >= count) {
        break
      }
    } catch {
      break
    }
  }
  return rows
}

export async function listAllProductHandles(): Promise<HandleRow[]> {
  const region = await getRegion().catch(() => null)
  if (!region) {
    return []
  }
  return pageThrough<HandleRow>("/store/products", "products", {
    region_id: region.id,
  })
}

export async function listAllCategoryHandles(): Promise<HandleRow[]> {
  return pageThrough<HandleRow>(
    "/store/product-categories",
    "product_categories"
  )
}

/**
 * Products for a list of handles, in the order given, priced for the store
 * region. Unknown handles are skipped silently (the CMS is edited by hand).
 */
export async function listProductsByHandles(
  handles: string[],
  limit = 12
): Promise<HttpTypes.StoreProduct[]> {
  const wanted = Array.from(new Set(handles.filter(Boolean))).slice(0, limit)
  if (!wanted.length) {
    return []
  }
  try {
    const {
      response: { products },
    } = await listProducts({
      queryParams: { handle: wanted, limit: wanted.length },
    })
    const byHandle = new Map(products.map((p) => [p.handle, p]))
    return wanted
      .map((h) => byHandle.get(h))
      .filter((p): p is HttpTypes.StoreProduct => !!p)
  } catch {
    return []
  }
}

/** Products of a collection by handle; `[]` when the collection is missing. */
export async function listProductsByCollectionHandle(
  handle: string,
  limit = 12
): Promise<HttpTypes.StoreProduct[]> {
  try {
    const collection = await getCollectionByHandle(handle)
    if (!collection) {
      return []
    }
    const {
      response: { products },
    } = await listProducts({
      queryParams: { collection_id: [collection.id], limit },
    })
    return products
  } catch {
    return []
  }
}

/** Newest products, for the homepage when no `featured` collection exists. */
export async function listLatestProducts(
  limit = 8
): Promise<HttpTypes.StoreProduct[]> {
  try {
    const {
      response: { products },
    } = await listProducts({
      queryParams: { limit, order: "-created_at" },
    })
    return products
  } catch {
    return []
  }
}
