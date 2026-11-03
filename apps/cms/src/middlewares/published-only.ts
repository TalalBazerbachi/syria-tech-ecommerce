import type { Core } from '@strapi/strapi';

/**
 * Anonymous (Public role) requests to the content API only ever see published
 * entries. Strapi 5 honours `?status=draft` for any caller that has `find`
 * permission, so the Public role could otherwise read drafts by adding one
 * query parameter. Requests that carry an Authorization header (an API token,
 * e.g. a future storefront preview token) are left alone.
 *
 * Registered in config/middlewares.ts right after `strapi::query`, which
 * installs the `qs`-based query parser this relies on (assigning ctx.query
 * re-serialises with qs, so nested filters survive).
 */
const publishedOnly: Core.MiddlewareFactory = (_config, { strapi }) => {
  return async (ctx, next) => {
    if (ctx.request.path.startsWith('/api/') && !ctx.request.header.authorization) {
      const query = ctx.query as Record<string, unknown>;
      if (query.status !== undefined && query.status !== 'published') {
        strapi.log.debug(`[published-only] forced status=published on ${ctx.request.path}`);
      }
      ctx.query = { ...query, status: 'published' };
    }
    await next();
  };
};

export default publishedOnly;
