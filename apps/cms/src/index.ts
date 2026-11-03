import type { Core } from '@strapi/strapi';

/**
 * Locales the SEO content is written in. `en` is Strapi's default locale;
 * editors add an `ar` localization to each entry (same documentId).
 */
const REQUIRED_LOCALES = [
  { code: 'en', name: 'English (en)' },
  { code: 'ar', name: 'Arabic (ar)' },
];

/**
 * The storefront reads these collections server-side without any token. The
 * Public role gets `find` + `findOne` on exactly these four types and nothing
 * else; Strapi only serves published entries to the Public role, so drafts
 * stay private. No API token is issued to anything.
 */
const PUBLIC_READ_CONTENT_TYPES = ['article', 'landing-page', 'category-seo', 'product-seo'];

async function ensureLocales(strapi: Core.Strapi) {
  const localesService = strapi.plugin('i18n').service('locales');
  const existing: Array<{ code: string }> = await localesService.find();
  for (const loc of REQUIRED_LOCALES) {
    if (!existing.find((l) => l.code === loc.code)) {
      await localesService.create({ code: loc.code, name: loc.name });
      strapi.log.info(`[bootstrap] created locale ${loc.code}`);
    }
  }
}

async function ensurePublicRead(strapi: Core.Strapi) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!publicRole) return;

  const wanted = new Set(
    PUBLIC_READ_CONTENT_TYPES.flatMap((ct) => [`api::${ct}.${ct}.find`, `api::${ct}.${ct}.findOne`])
  );
  const existing: Array<{ id: number; action: string }> = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({ where: { role: publicRole.id }, select: ['id', 'action'] });
  const have = new Set(existing.map((p) => p.action));

  for (const action of wanted) {
    if (have.has(action)) continue;
    await strapi.db
      .query('plugin::users-permissions.permission')
      .create({ data: { action, role: publicRole.id } });
    strapi.log.info(`[bootstrap] granted public ${action}`);
  }

  // Revoke any other content-type permission Public may have picked up (a type
  // that was removed, or something toggled by hand). Plugin permissions
  // (plugin::users-permissions.auth.*, ...) are left alone.
  for (const perm of existing) {
    if (!perm.action.startsWith('api::') || wanted.has(perm.action)) continue;
    await strapi.db.query('plugin::users-permissions.permission').delete({ where: { id: perm.id } });
    strapi.log.info(`[bootstrap] revoked public ${perm.action}`);
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureLocales(strapi);
    if (process.env.STRAPI_PUBLIC_READ !== 'false') {
      await ensurePublicRead(strapi);
    }
  },
};
