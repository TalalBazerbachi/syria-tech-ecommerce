import type { Core } from '@strapi/strapi';

/**
 * Production-sane middleware stack. The security middleware's CSP must allow
 * the media host (MinIO behind Caddy, or localhost in dev) so uploaded images
 * render in the admin's media library.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const mediaHosts = env
    .array('CSP_MEDIA_HOSTS', [] as string[])
    .map((h: string) => h.trim())
    .filter(Boolean);

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', ...mediaHosts],
            'media-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', ...mediaHosts],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        // Only the admin UI (same origin) and explicitly listed origins may call the API from a browser.
        origin: env.array('CORS_ORIGINS', ['http://localhost:1337']),
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
        credentials: true,
      },
    },
    {
      name: 'strapi::poweredBy',
      config: { poweredBy: 'Syria Tech Store CMS' },
    },
    'strapi::query',
    // Anonymous /api/* callers get status=published forced (src/middlewares/published-only.ts).
    'global::published-only',
    {
      name: 'strapi::body',
      config: {
        formLimit: '10mb',
        jsonLimit: '2mb',
        textLimit: '2mb',
        formidable: { maxFileSize: 25 * 1024 * 1024 },
      },
    },
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
