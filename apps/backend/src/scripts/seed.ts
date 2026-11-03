/**
 * Launch seed for the Syria tech store. Idempotent: every step looks up what it
 * is about to create and skips or completes it, so the script can run on every
 * deploy. Run inside the server container:
 *
 *   npx medusa exec ./src/scripts/seed.js        (built image)
 *   npx medusa exec ./src/scripts/seed.ts        (development)
 *
 * What it creates (see docs/architecture.md "Seed data"):
 * - store currency `usd` (default). SYP is NOT seeded; add it later as a
 *   second region with no countries (docs/runbook.md).
 * - region "Syria" (usd, country sy, cash on delivery via pp_system_default)
 * - "Default Sales Channel" + a publishable API key for the storefront
 * - stock location "Damascus Warehouse" with the manual fulfillment provider
 * - fulfillment set "Syria delivery" with one service zone per launch
 *   governorate (province geo zones sy-di, sy-rd) and a flat USD courier
 *   shipping option per zone
 * - tech-store categories with Arabic (ar-SA) translations
 * - two sample products, USD prices only, with Arabic translations
 */
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  batchTranslationsWorkflow,
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { COUNTRY_CODE, GOVERNORATES, LAUNCH_ZONE_CODES } from "../data/governorates"

const CURRENCY = "usd"
const AR_LOCALE = "ar-SA"
const REGION_NAME = "Syria"
const SALES_CHANNEL_NAME = "Default Sales Channel"
const PUBLISHABLE_KEY_TITLE = "Storefront"
const STOCK_LOCATION_NAME = "Damascus Warehouse"
const FULFILLMENT_SET_NAME = "Syria delivery"
const FULFILLMENT_PROVIDER = "manual_manual"
const PAYMENT_PROVIDER = "pp_system_default"
/** Placeholder flat courier fee per zone, in USD. Staff adjust in admin. */
const COURIER_FEE_USD = 3

const CATEGORIES: { handle: string; name: string; name_ar: string }[] = [
  { handle: "laptops", name: "Laptops", name_ar: "لابتوبات" },
  { handle: "accessories", name: "Accessories", name_ar: "إكسسوارات" },
  { handle: "peripherals", name: "Peripherals", name_ar: "ملحقات الكمبيوتر" },
  { handle: "networking", name: "Networking", name_ar: "شبكات" },
  { handle: "storage", name: "Storage", name_ar: "وحدات تخزين" },
  { handle: "audio", name: "Audio", name_ar: "صوتيات" },
]

type SampleProduct = {
  handle: string
  category: string
  title: string
  subtitle: string
  description: string
  title_ar: string
  subtitle_ar: string
  description_ar: string
  weight: number
  option: { title: string; title_ar: string; values: { value: string; value_ar: string }[] }
  variants: { sku: string; option_value: string; price_usd: number; stock: number }[]
}

const PRODUCTS: SampleProduct[] = [
  {
    handle: "lenovo-ideapad-slim-3-15",
    category: "laptops",
    title: "Lenovo IdeaPad Slim 3 15\"",
    subtitle: "Ryzen 5 7520U · 16 GB · 512 GB SSD",
    description:
      "A thin 15.6-inch everyday laptop for study and office work: AMD Ryzen 5, 16 GB of memory and a 512 GB NVMe SSD. Full HD anti-glare screen, Wi-Fi 6, 1-year local warranty.",
    title_ar: "لينوفو آيديا باد سليم 3 مقاس 15 إنش",
    subtitle_ar: "رايزن 5 7520U · 16 جيجابايت · 512 جيجابايت SSD",
    description_ar:
      "لابتوب نحيف بشاشة 15.6 إنش للدراسة والعمل المكتبي: معالج AMD رايزن 5، ذاكرة 16 جيجابايت وقرص NVMe SSD بسعة 512 جيجابايت. شاشة Full HD مضادة للانعكاس، واي فاي 6، وكفالة محلية لمدة سنة.",
    weight: 1620,
    option: {
      title: "Color",
      title_ar: "اللون",
      values: [
        { value: "Arctic Grey", value_ar: "رمادي" },
        { value: "Abyss Blue", value_ar: "أزرق" },
      ],
    },
    variants: [
      { sku: "LEN-IP3-15-GRY", option_value: "Arctic Grey", price_usd: 549, stock: 8 },
      { sku: "LEN-IP3-15-BLU", option_value: "Abyss Blue", price_usd: 549, stock: 5 },
    ],
  },
  {
    handle: "logitech-mx-master-3s",
    category: "peripherals",
    title: "Logitech MX Master 3S",
    subtitle: "Wireless mouse · 8K DPI · Quiet clicks",
    description:
      "Logitech's flagship productivity mouse: 8000 DPI sensor that tracks on glass, MagSpeed scroll wheel, quiet clicks and up to 70 days per charge. Connects over Bluetooth or the included Logi Bolt receiver, pairs with up to three devices.",
    title_ar: "لوجيتك MX Master 3S",
    subtitle_ar: "ماوس لاسلكي · 8K DPI · نقرات هادئة",
    description_ar:
      "ماوس الإنتاجية الأول من لوجيتك: مستشعر بدقة 8000 DPI يعمل على الزجاج، عجلة تمرير MagSpeed، نقرات هادئة وبطارية تدوم حتى 70 يوماً. يتصل عبر البلوتوث أو مستقبل Logi Bolt المرفق، ويقترن بثلاثة أجهزة.",
    weight: 141,
    option: {
      title: "Color",
      title_ar: "اللون",
      values: [
        { value: "Graphite", value_ar: "غرافيت" },
        { value: "Pale Grey", value_ar: "رمادي فاتح" },
      ],
    },
    variants: [
      { sku: "LOG-MXM3S-GRA", option_value: "Graphite", price_usd: 99, stock: 20 },
      { sku: "LOG-MXM3S-PGR", option_value: "Pale Grey", price_usd: 99, stock: 12 },
    ],
  },
]

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const translation = container.resolve<any>(Modules.TRANSLATION)

  const log = (msg: string) => logger.info(`[seed] ${msg}`)

  // ---------------------------------------------------------------- sales channel
  const findSalesChannels = () =>
    query.graph({ entity: "sales_channel", fields: ["id", "name"], filters: { name: SALES_CHANNEL_NAME } })
  let { data: salesChannels } = await findSalesChannels()
  if (!salesChannels.length) {
    await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: SALES_CHANNEL_NAME }] },
    })
    ;({ data: salesChannels } = await findSalesChannels())
    log(`created sales channel "${SALES_CHANNEL_NAME}"`)
  }
  const salesChannel = salesChannels[0]

  // ------------------------------------------------------------------------ store
  const findStores = () =>
    query.graph({
      entity: "store",
      fields: ["id", "name", "default_sales_channel_id", "default_region_id", "supported_currencies.*"],
    })
  let { data: stores } = await findStores()
  if (!stores.length) {
    await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: "Syria Tech Store",
            supported_currencies: [{ currency_code: CURRENCY, is_default: true }],
            default_sales_channel_id: salesChannel.id,
          },
        ],
      },
    })
    ;({ data: stores } = await findStores())
    log("created store")
  }
  const store = stores[0]

  // ----------------------------------------------------------------------- region
  const findRegions = () =>
    query.graph({
      entity: "region",
      fields: ["id", "name", "currency_code", "countries.iso_2", "payment_providers.id"],
      filters: { name: REGION_NAME },
    })
  let { data: regions } = await findRegions()
  if (!regions.length) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION_NAME,
            currency_code: CURRENCY,
            countries: [COUNTRY_CODE],
            payment_providers: [PAYMENT_PROVIDER],
          },
        ],
      },
    })
    ;({ data: regions } = await findRegions())
    log(`created region "${REGION_NAME}" (${CURRENCY}, ${COUNTRY_CODE}, ${PAYMENT_PROVIDER})`)
  }
  const region = regions[0]

  // Store: USD only + defaults. Never adds SYP here (see runbook).
  const supported = (store.supported_currencies ?? []) as { currency_code: string; is_default: boolean }[]
  const storeNeedsUpdate =
    !supported.some((c) => c.currency_code === CURRENCY && c.is_default) ||
    store.default_sales_channel_id !== salesChannel.id ||
    store.default_region_id !== region.id
  if (storeNeedsUpdate) {
    const currencies = supported.some((c) => c.currency_code === CURRENCY)
      ? supported.map((c) => ({ currency_code: c.currency_code, is_default: c.currency_code === CURRENCY }))
      : [{ currency_code: CURRENCY, is_default: true }]
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: currencies,
          default_sales_channel_id: salesChannel.id,
          default_region_id: region.id,
        },
      },
    })
    log(`store updated: default currency ${CURRENCY}, default region ${REGION_NAME}`)
  }

  // ------------------------------------------------------------ publishable key
  const findApiKeys = () =>
    query.graph({
      entity: "api_key",
      fields: ["id", "title", "token", "type", "sales_channels.id"],
      filters: { type: "publishable", title: PUBLISHABLE_KEY_TITLE },
    })
  let { data: apiKeys } = await findApiKeys()
  if (!apiKeys.length) {
    await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [{ title: PUBLISHABLE_KEY_TITLE, type: "publishable", created_by: "seed" }],
      },
    })
    ;({ data: apiKeys } = await findApiKeys())
    log(`created publishable API key "${PUBLISHABLE_KEY_TITLE}"`)
  }
  const publishableKey = apiKeys[0]
  const keyChannels = (publishableKey.sales_channels ?? []) as { id: string }[]
  if (!keyChannels.some((c) => c?.id === salesChannel.id)) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableKey.id, add: [salesChannel.id] },
    })
    log("linked publishable key to sales channel")
  }

  // ------------------------------------------------------------- stock location
  let { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "fulfillment_providers.id", "sales_channels.id", "fulfillment_sets.id", "fulfillment_sets.name"],
    filters: { name: STOCK_LOCATION_NAME },
  })
  if (!locations.length) {
    await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: STOCK_LOCATION_NAME,
            address: {
              address_1: "Al-Hamra Street",
              city: "Damascus",
              province: "sy-di",
              country_code: COUNTRY_CODE.toUpperCase(),
            },
          },
        ],
      },
    })
    ;({ data: locations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name", "fulfillment_providers.id", "sales_channels.id", "fulfillment_sets.id", "fulfillment_sets.name"],
      filters: { name: STOCK_LOCATION_NAME },
    }))
    log(`created stock location "${STOCK_LOCATION_NAME}"`)
  }
  const location = locations[0]

  const providers = (location.fulfillment_providers ?? []) as { id: string }[]
  if (!providers.some((p) => p?.id === FULFILLMENT_PROVIDER)) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: FULFILLMENT_PROVIDER },
    })
    log(`linked ${FULFILLMENT_PROVIDER} to ${STOCK_LOCATION_NAME}`)
  }

  const locationChannels = (location.sales_channels ?? []) as { id: string }[]
  if (!locationChannels.some((c) => c?.id === salesChannel.id)) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [salesChannel.id] },
    })
    log("linked stock location to sales channel")
  }

  // ----------------------------------------------------------- shipping profile
  const findShippingProfiles = () =>
    query.graph({ entity: "shipping_profile", fields: ["id", "name", "type"], filters: { type: "default" } })
  let { data: shippingProfiles } = await findShippingProfiles()
  if (!shippingProfiles.length) {
    await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    ;({ data: shippingProfiles } = await findShippingProfiles())
    log("created default shipping profile")
  }
  const shippingProfile = shippingProfiles[0]

  // ------------------------------------------------ fulfillment set + zones
  const locationSets = (location.fulfillment_sets ?? []) as { id: string; name: string }[]
  let fulfillmentSetId = locationSets.find((s) => s?.name === FULFILLMENT_SET_NAME)?.id
  if (!fulfillmentSetId) {
    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: location.id,
        fulfillment_set_data: { name: FULFILLMENT_SET_NAME, type: "shipping" },
      },
    })
    const { data: sets } = await query.graph({
      entity: "fulfillment_set",
      fields: ["id", "name"],
      filters: { name: FULFILLMENT_SET_NAME },
    })
    fulfillmentSetId = sets[0].id
    log(`created fulfillment set "${FULFILLMENT_SET_NAME}"`)
  }

  const { data: [fulfillmentSet] } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.id", "service_zones.name", "service_zones.geo_zones.province_code"],
    filters: { id: fulfillmentSetId },
  })
  const existingZones = (fulfillmentSet.service_zones ?? []) as { id: string; name: string }[]

  const launchGovernorates = GOVERNORATES.filter((g) => LAUNCH_ZONE_CODES.includes(g.code))
  const missingZones = launchGovernorates.filter((g) => !existingZones.some((z) => z?.name === g.name_en))
  if (missingZones.length) {
    await createServiceZonesWorkflow(container).run({
      input: {
        data: missingZones.map((g) => ({
          fulfillment_set_id: fulfillmentSetId!,
          name: g.name_en,
          geo_zones: [{ type: "province" as const, country_code: COUNTRY_CODE, province_code: g.code }],
        })),
      },
    })
    log(`created service zones: ${missingZones.map((g) => `${g.name_en} (${g.code})`).join(", ")}`)
  }

  const { data: [setWithZones] } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "service_zones.id", "service_zones.name"],
    filters: { id: fulfillmentSetId },
  })
  const zones = (setWithZones.service_zones ?? []) as { id: string; name: string }[]

  // ------------------------------------------------------------ shipping options
  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  })
  const optionsToCreate = launchGovernorates
    .map((g) => ({ g, zone: zones.find((z) => z.name === g.name_en)! }))
    .filter(({ g, zone }) => zone && !shippingOptions.some((o) => o.service_zone_id === zone.id && o.name === `${g.name_en} courier (COD)`))

  const createdOptionTranslations: { id: string; name_ar: string }[] = []
  if (optionsToCreate.length) {
    const { result } = await createShippingOptionsWorkflow(container).run({
      input: optionsToCreate.map(({ g, zone }) => ({
        name: `${g.name_en} courier (COD)`,
        price_type: "flat" as const,
        provider_id: FULFILLMENT_PROVIDER,
        service_zone_id: zone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Courier",
          description: "Delivered by courier, pay cash on delivery.",
          code: "courier",
        },
        prices: [
          { currency_code: CURRENCY, amount: COURIER_FEE_USD },
          { region_id: region.id, amount: COURIER_FEE_USD },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
          { attribute: "is_return", value: "false", operator: "eq" as const },
        ],
      })),
    })
    for (const created of result) {
      const g = optionsToCreate.find(({ zone }) => zone.id === created.service_zone_id)?.g
      if (g) createdOptionTranslations.push({ id: created.id, name_ar: `توصيل ${g.name_ar} (الدفع عند الاستلام)` })
    }
    log(`created shipping options: ${optionsToCreate.map(({ g }) => g.name_en).join(", ")}`)
  }

  // ---------------------------------------------------------------- translations
  // Upsert helper: the Translation module keys on (reference, reference_id, locale).
  const upsertTranslations = async (
    items: { reference: string; reference_id: string; translations: Record<string, string> }[]
  ) => {
    if (!items.length) return
    const existing: { id: string; reference: string; reference_id: string; translations: Record<string, string> }[] =
      await translation.listTranslations(
        {
          reference: [...new Set(items.map((i) => i.reference))],
          reference_id: items.map((i) => i.reference_id),
          locale_code: AR_LOCALE,
        },
        { take: items.length * 2 }
      )
    const create: any[] = []
    const update: any[] = []
    for (const item of items) {
      const found = existing.find((e) => e.reference === item.reference && e.reference_id === item.reference_id)
      if (!found) {
        create.push({ ...item, locale_code: AR_LOCALE })
      } else if (JSON.stringify(found.translations) !== JSON.stringify(item.translations)) {
        update.push({ id: found.id, translations: item.translations })
      }
    }
    if (create.length || update.length) {
      await batchTranslationsWorkflow(container).run({ input: { create, update, delete: [] } })
    }
    return { created: create.length, updated: update.length }
  }

  // Shipping option names (all launch zones, not just the ones created now)
  const { data: allOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  })
  const optionTranslations = allOptions
    .map((o) => {
      const zone = zones.find((z) => z.id === o.service_zone_id)
      const g = launchGovernorates.find((g) => g.name_en === zone?.name)
      return g ? { reference: "shipping_option", reference_id: o.id, translations: { name: `توصيل ${g.name_ar} (الدفع عند الاستلام)` } } : null
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
  await upsertTranslations(optionTranslations)

  // ------------------------------------------------------------------ categories
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  })
  const missingCategories = CATEGORIES.filter((c) => !existingCategories.some((e) => e.handle === c.handle))
  if (missingCategories.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories.map((c) => ({ name: c.name, handle: c.handle, is_active: true })),
      },
    })
    log(`created categories: ${missingCategories.map((c) => c.name).join(", ")}`)
  }
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  })
  const categoryTranslations = CATEGORIES.map((c) => {
    const cat = categories.find((e) => e.handle === c.handle)!
    return { reference: "product_category", reference_id: cat.id, translations: { name: c.name_ar } }
  })
  const catResult = await upsertTranslations(categoryTranslations)
  log(`category translations (${AR_LOCALE}): ${catResult?.created ?? 0} created, ${catResult?.updated ?? 0} updated`)

  // -------------------------------------------------------------------- products
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: PRODUCTS.map((p) => p.handle) },
  })
  const missingProducts = PRODUCTS.filter((p) => !existingProducts.some((e) => e.handle === p.handle))
  if (missingProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: missingProducts.map((p) => ({
          title: p.title,
          subtitle: p.subtitle,
          description: p.description,
          handle: p.handle,
          weight: p.weight,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          category_ids: [categories.find((c) => c.handle === p.category)!.id],
          // Inline (exclusive) options: shared options caused trouble in the spike
          // and are not needed for a catalogue of this size.
          options: [{ title: p.option.title, values: p.option.values.map((v) => v.value) }],
          variants: p.variants.map((v) => ({
            title: v.option_value,
            sku: v.sku,
            manage_inventory: true,
            options: { [p.option.title]: v.option_value },
            // USD only. SYP prices are added later as extra price rows (runbook).
            prices: [{ amount: v.price_usd, currency_code: CURRENCY }],
          })),
          sales_channels: [{ id: salesChannel.id }],
        })),
      },
    })
    log(`created products: ${missingProducts.map((p) => p.handle).join(", ")}`)
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "options.id",
      "options.title",
      "options.values.id",
      "options.values.value",
      "variants.id",
      "variants.sku",
      "variants.inventory_items.inventory_item_id",
      "variants.inventory_items.inventory.location_levels.location_id",
    ],
    filters: { handle: PRODUCTS.map((p) => p.handle) },
  })

  // Inventory at Damascus Warehouse (only where no level exists yet)
  const levelsToCreate: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
  for (const product of products) {
    const def = PRODUCTS.find((p) => p.handle === product.handle)!
    for (const variant of product.variants ?? []) {
      const stock = def.variants.find((v) => v.sku === variant?.sku)?.stock ?? 0
      for (const ii of variant?.inventory_items ?? []) {
        const levels = (ii?.inventory?.location_levels ?? []) as { location_id: string }[]
        if (ii?.inventory_item_id && !levels.some((l) => l?.location_id === location.id)) {
          levelsToCreate.push({ inventory_item_id: ii.inventory_item_id, location_id: location.id, stocked_quantity: stock })
        }
      }
    }
  }
  if (levelsToCreate.length) {
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: levelsToCreate } })
    log(`created ${levelsToCreate.length} inventory levels at ${STOCK_LOCATION_NAME}`)
  }

  // Arabic translations for products, their option and option values
  const productTranslations: { reference: string; reference_id: string; translations: Record<string, string> }[] = []
  for (const product of products) {
    const def = PRODUCTS.find((p) => p.handle === product.handle)!
    productTranslations.push({
      reference: "product",
      reference_id: product.id,
      translations: { title: def.title_ar, subtitle: def.subtitle_ar, description: def.description_ar },
    })
    for (const option of product.options ?? []) {
      if (!option) continue
      if (option.title === def.option.title) {
        productTranslations.push({ reference: "product_option", reference_id: option.id, translations: { title: def.option.title_ar } })
      }
      for (const value of option.values ?? []) {
        const ar = def.option.values.find((v) => v.value === value?.value)?.value_ar
        if (value && ar) {
          productTranslations.push({ reference: "product_option_value", reference_id: value.id, translations: { value: ar } })
        }
      }
    }
  }
  const prodResult = await upsertTranslations(productTranslations)
  log(`product translations (${AR_LOCALE}): ${prodResult?.created ?? 0} created, ${prodResult?.updated ?? 0} updated`)

  log("done")
  log(`region=${region.id} sales_channel=${salesChannel.id} stock_location=${location.id}`)
  log(`publishable key "${PUBLISHABLE_KEY_TITLE}" id=${publishableKey.id} (token: GET /admin/api-keys?type=publishable)`)
}
