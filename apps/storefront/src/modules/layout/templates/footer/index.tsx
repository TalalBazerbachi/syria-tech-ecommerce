import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listLegalPages } from "@lib/data/content"
import { defaultLocale, isAppLocale } from "@i18n/routing"
import { Text, clx } from "@modules/common/components/ui"
import { getLocale, getTranslations } from "next-intl/server"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LocaleSwitcher from "@modules/layout/components/locale-switcher"
import MedusaCTA from "@modules/layout/components/medusa-cta"
import StoreContact from "@modules/layout/components/store-contact"

export default async function Footer() {
  const t = await getTranslations("common")
  const rawLocale = await getLocale()
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale
  const [{ collections }, productCategories, legalPages] = await Promise.all([
    listCollections({ fields: "id, handle, title" }).catch(() => ({
      collections: [],
      count: 0,
    })),
    listCategories({ fields: "id, handle, name, *category_children, *parent_category" }).catch(
      () => []
    ),
    listLegalPages(locale),
  ])

  return (
    <footer className="border-t border-ui-border-base w-full">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-24 small:py-40">
          <div className="flex flex-col gap-y-4">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base"
            >
              {t("storeName")}
            </LocalizedClientLink>
            <Text className="txt-small text-ui-fg-subtle max-w-xs">
              {t("tagline")}
            </Text>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-4">
            {productCategories && productCategories.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  {t("categories")}
                </span>
                <ul
                  className="grid grid-cols-1 gap-2"
                  data-testid="footer-categories"
                >
                  {productCategories.slice(0, 6).map((c) => {
                    if (c.parent_category) {
                      return null
                    }

                    const children =
                      c.category_children?.map((child) => ({
                        name: child.name,
                        handle: child.handle,
                        id: child.id,
                      })) || null

                    return (
                      <li
                        className="flex flex-col gap-2 text-ui-fg-subtle txt-small"
                        key={c.id}
                      >
                        <LocalizedClientLink
                          className={clx(
                            "hover:text-ui-fg-base",
                            children && "txt-small-plus"
                          )}
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                        {children && children.length > 0 && (
                          <ul className="grid grid-cols-1 ms-3 gap-2">
                            {children.map((child) => (
                              <li key={child.id}>
                                <LocalizedClientLink
                                  className="hover:text-ui-fg-base"
                                  href={`/categories/${child.handle}`}
                                  data-testid="category-link"
                                >
                                  {child.name}
                                </LocalizedClientLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  {t("collections")}
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small",
                    {
                      "grid-cols-2": (collections?.length || 0) > 3,
                    }
                  )}
                >
                  {collections.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base">{t("information")}</span>
              <ul
                className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small"
                data-testid="footer-information"
              >
                <li>
                  <LocalizedClientLink className="hover:text-ui-fg-base" href="/guides">
                    {t("guides")}
                  </LocalizedClientLink>
                </li>
                {legalPages.map((page) => (
                  <li key={page.slug}>
                    <LocalizedClientLink
                      className="hover:text-ui-fg-base"
                      href={`/pages/${page.slug}`}
                      data-testid={`footer-page-${page.slug}`}
                    >
                      {page.title}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base">{t("help")}</span>
              <StoreContact className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small" />
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                <li>
                  <LocalizedClientLink className="hover:text-ui-fg-base" href="/account">
                    {t("account")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink className="hover:text-ui-fg-base" href="/cart">
                    {t("cart")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocaleSwitcher />
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex w-full mb-16 justify-between text-ui-fg-muted">
          <Text className="txt-compact-small">
            {t("copyright", { year: new Date().getFullYear(), store: t("storeName") })}
          </Text>
          <MedusaCTA />
        </div>
      </div>
    </footer>
  )
}
