const createNextIntlPlugin = require("next-intl/plugin")
const checkEnvVariables = require("./check-env-variables")

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

/**
 * Hosts product media may be served from (MinIO behind Caddy in production,
 * localhost in development). `next/image` runs `unoptimized`, so this list is
 * only consulted for `fill`/`sizes` validation, but keep it honest.
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
    unoptimized: true,
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
