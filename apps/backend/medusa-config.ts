import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProduction = process.env.NODE_ENV === "production"
const translationEnabled = process.env.MEDUSA_FF_TRANSLATION !== "false"
const redisUrl = process.env.REDIS_URL

/**
 * Analytics Module provider (docs/analytics.md). `posthog` sends the money events
 * ("Order Completed", "Order Cancelled", "Order Delivered", "Payment Captured") to PostHog Cloud
 * EU; `local` logs them through Medusa's logger at debug level (LOG_LEVEL=debug) for
 * development. Default: posthog when POSTHOG_EVENTS_KEY is set, local otherwise.
 * A requested posthog without a key falls back to local with a warning instead of
 * refusing to boot: analytics must never take the store down.
 */
const posthogEventsKey = process.env.POSTHOG_EVENTS_KEY
let analyticsProvider = process.env.ANALYTICS_PROVIDER || (posthogEventsKey ? "posthog" : "local")
if (analyticsProvider === "posthog" && !posthogEventsKey) {
  console.warn("[analytics] ANALYTICS_PROVIDER=posthog but POSTHOG_EVENTS_KEY is empty; using the local provider")
  analyticsProvider = "local"
}
const analyticsProviderConfig =
  analyticsProvider === "posthog"
    ? {
        resolve: "@medusajs/medusa/analytics-posthog",
        id: "posthog",
        options: {
          posthogEventsKey,
          posthogHost: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
        },
      }
    : { resolve: "@medusajs/medusa/analytics-local", id: "local" }

/**
 * Production-shaped config (docs.medusajs.com/learn/deployment/general):
 * - Redis for event bus, workflow engine, caching and locking (same instance, one URL)
 * - S3 file provider pointed at MinIO (path-style URLs)
 * - server/worker split via MEDUSA_WORKER_MODE; the worker disables the admin
 * - Translation module on (Arabic short text lives here, locale `ar-SA`)
 *
 * DATABASE_URL must carry `?sslmode=disable` on the internal network: Medusa
 * 2.21 forces SSL for non-localhost hosts and strips the documented
 * `ssl_mode=` variant before checking (see docs/spike-report-2026-10-20.md).
 */
module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl,
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || (isProduction ? undefined : "supersecret"),
      cookieSecret: process.env.COOKIE_SECRET || (isProduction ? undefined : "supersecret"),
    },
    // In production Medusa marks the admin session cookie `Secure` (HTTPS only)
    // and trusts the proxy, so it works behind Caddy's TLS. Over plain HTTP
    // (local docker-compose.dev.yml) the browser would never receive the
    // cookie and the admin login loops. COOKIE_SECURE=false is set by the dev
    // override only; it must never be set on a server.
    ...(process.env.COOKIE_SECURE === "false"
      ? { cookieOptions: { secure: false } }
      : {}),
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    // Unset = same-origin (the admin is served by this server at /app), so one
    // image works for staging and production. Set only for a split deployment.
    backendUrl: process.env.MEDUSA_BACKEND_URL || undefined,
    storefrontUrl: process.env.STOREFRONT_URL || undefined,
  },
  modules: [
    ...(translationEnabled ? [{ resolve: "@medusajs/medusa/translation" }] : []),
    {
      resolve: "@medusajs/medusa/analytics",
      options: { providers: [analyticsProviderConfig] },
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION || "us-east-1",
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              prefix: process.env.S3_PREFIX || "",
              // MinIO serves <endpoint>/<bucket>/<key>, not <bucket>.<endpoint>
              additional_client_config: { forcePathStyle: true },
            },
          },
        ],
      },
    },
    ...(redisUrl
      ? [
          {
            resolve: "@medusajs/medusa/caching",
            options: {
              providers: [
                {
                  resolve: "@medusajs/caching-redis",
                  id: "caching-redis",
                  is_default: true,
                  options: { redisUrl: process.env.CACHE_REDIS_URL || redisUrl },
                },
              ],
            },
          },
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: { redisUrl },
          },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: { redis: { redisUrl } },
          },
          {
            resolve: "@medusajs/medusa/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/locking-redis",
                  id: "locking-redis",
                  is_default: true,
                  options: { redisUrl: process.env.LOCKING_REDIS_URL || redisUrl },
                },
              ],
            },
          },
        ]
      : []),
  ],
  featureFlags: {
    caching: Boolean(redisUrl),
    translation: translationEnabled,
  },
})
