import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Public URL (behind Caddy), used for absolute links in the admin and emails.
  url: env('PUBLIC_URL', ''),
  // Behind a reverse proxy: trust X-Forwarded-* so https/host are right.
  proxy: env.bool('IS_PROXIED', true),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  // No outbound webhooks from this CMS: nothing subscribes to content changes
  // (the storefront re-fetches on its own cache schedule).
  webhooks: {
    populateRelations: false,
  },
});

export default config;
