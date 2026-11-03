import {
  configureStoreSearch,
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * Linking products to a sales channel or a category runs workflows that emit
 * no event (`linkProductsToSalesChannelWorkflow`,
 * `batchLinkProductsToCategoryWorkflow`), so the search index would keep the
 * old channel/category membership until the product is edited again. A
 * product outside the storefront's channel is hidden from the store grid, so
 * staff adding a product to the channel from the admin would never see it
 * appear. After a successful call to these admin routes, emit
 * `product.updated` for every product involved; the search index consumes
 * that event and re-reads the product.
 */
const reindexLinkedProducts = (
  req: MedusaRequest<{ add?: string[]; remove?: string[] }>,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const body = (req.body ?? {}) as { add?: string[]; remove?: string[] }
  const ids = [...(body.add ?? []), ...(body.remove ?? [])].filter(Boolean)

  if (ids.length) {
    res.on("finish", () => {
      if (res.statusCode >= 300) {
        return
      }
      const eventBus = req.scope.resolve(Modules.EVENT_BUS)
      eventBus
        .emit(ids.map((id) => ({ name: "product.updated", data: { id } })))
        .catch((error: unknown) => {
          req.scope
            .resolve("logger")
            .warn(`search re-index after link failed: ${String(error)}`)
        })
    })
  }

  next()
}

export default defineMiddlewares({
  routes: [
    // Product search index exposed to the storefront.
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/admin/sales-channels/:id/products",
      middlewares: [reindexLinkedProducts],
    },
    {
      method: ["POST"],
      matcher: "/admin/product-categories/:id/products",
      middlewares: [reindexLinkedProducts],
    },
  ],
})
