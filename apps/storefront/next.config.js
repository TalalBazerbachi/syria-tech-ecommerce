const createNextIntlPlugin = require("next-intl/plugin")
const checkEnvVariables = require("./check-env-variables")

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

/**
 * Host product and article media are served from (MinIO behind Caddy:
 * `MEDIA_DOMAIN`). Image settings are fixed into the build, so CI passes it as
 * a build arg from the repository variable `MEDIA_HOSTNAME`; a wildcard such as
 * `**.example.com` lets one image serve staging and production.
 *
 * Set: `next/image` resizes uploads to the `sizes` each component asks for and
 * serves WebP (a multi-megabyte phone photo shrinks to tens of KB in a product
 * card), cached on disk and by the browser. Unset (local `next dev`, or CI without the
 * variable): images are served as uploaded, as before.
 */
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOSTNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // `pnpm typecheck` (tsc --noEmit) is the gate; keep the build itself fast.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: !mediaHost,
    // Uploaded files get unique keys, so a resized copy never goes stale: 31 days.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      ...(mediaHost
        ? [
            {
              protocol: "https",
              hostname: mediaHost,
            },
          ]
        : []),
    ],
  },
}

// Exported as a function so the Next.js phase reaches the env check: missing
// variables only warn during `next build` (CI builds before the publishable
// key exists) and are fatal in dev/start.
module.exports = (phase) => {
  checkEnvVariables(phase)
  return withNextIntl(nextConfig)
}
