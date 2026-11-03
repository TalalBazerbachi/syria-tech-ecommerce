"use client"

import { ArrowRightOnRectangle } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { usePathname } from "@i18n/navigation"
import { useTranslations } from "next-intl"

import { reset as resetAnalytics } from "@lib/analytics/client"
import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const t = useTranslations("account")
  // next-intl's usePathname strips the locale prefix: `/account/orders`.
  const route = usePathname()

  const handleLogout = async () => {
    // New anonymous PostHog person from here on; `signout` redirects.
    resetAnalytics()
    await signout()
  }

  const mobileItems = [
    { href: "/account/profile", label: t("profile"), icon: <User size={20} />, testId: "profile-link" },
    { href: "/account/addresses", label: t("addresses"), icon: <MapPin size={20} />, testId: "addresses-link" },
    { href: "/account/orders", label: t("orders"), icon: <Package size={20} />, testId: "orders-link" },
  ]

  return (
    <div>
      <div className="small:hidden" data-testid="mobile-account-nav">
        {route !== "/account" ? (
          <LocalizedClientLink
            href="/account"
            className="flex items-center gap-x-2 text-small-regular py-2"
            data-testid="account-main-link"
          >
            <>
              <ChevronDown className="transform rotate-90 rtl:-rotate-90" />
              <span>{t("title")}</span>
            </>
          </LocalizedClientLink>
        ) : (
          <>
            <div className="text-xl-semi mb-4 px-8">
              {t("hello", { name: customer?.first_name ?? "" })}
            </div>
            <div className="text-base-regular">
              <ul>
                {mobileItems.map((item) => (
                  <li key={item.href}>
                    <LocalizedClientLink
                      href={item.href}
                      className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                      data-testid={item.testId}
                    >
                      <>
                        <div className="flex items-center gap-x-2">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown className="transform -rotate-90 rtl:rotate-90" />
                      </>
                    </LocalizedClientLink>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8 w-full"
                    onClick={handleLogout}
                    data-testid="logout-button"
                  >
                    <div className="flex items-center gap-x-2">
                      <ArrowRightOnRectangle className="rtl:-scale-x-100" />
                      <span>{t("logOut")}</span>
                    </div>
                    <ChevronDown className="transform -rotate-90 rtl:rotate-90" />
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
      <div className="hidden small:block" data-testid="account-nav">
        <div>
          <div className="pb-4">
            <h3 className="text-base-semi">{t("title")}</h3>
          </div>
          <div className="text-base-regular">
            <ul className="flex mb-0 justify-start items-start flex-col gap-y-4">
              <li>
                <AccountNavLink href="/account" route={route} data-testid="overview-link">
                  {t("overview")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink href="/account/profile" route={route} data-testid="profile-link">
                  {t("profile")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink href="/account/addresses" route={route} data-testid="addresses-link">
                  {t("addresses")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink href="/account/orders" route={route} data-testid="orders-link">
                  {t("orders")}
                </AccountNavLink>
              </li>
              <li className="text-grey-700">
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  {t("logOut")}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

type AccountNavLinkProps = {
  href: string
  route: string
  children: React.ReactNode
  "data-testid"?: string
}

const AccountNavLink = ({
  href,
  route,
  children,
  "data-testid": dataTestId,
}: AccountNavLinkProps) => {
  const active = route === href
  return (
    <LocalizedClientLink
      href={href}
      className={clx("text-ui-fg-subtle hover:text-ui-fg-base", {
        "text-ui-fg-base font-semibold": active,
      })}
      data-testid={dataTestId}
    >
      {children}
    </LocalizedClientLink>
  )
}

export default AccountNav
