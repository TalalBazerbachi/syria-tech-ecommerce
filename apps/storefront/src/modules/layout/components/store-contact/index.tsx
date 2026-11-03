import { getStoreContact } from "@lib/util/contact"
import { getTranslations } from "next-intl/server"

/**
 * Server component: WhatsApp and phone links from `STORE_WHATSAPP` /
 * `STORE_PHONE`. Renders nothing when neither is set. Numbers are LTR inside
 * the RTL layout (`dir="ltr"` on the number only).
 */
export default async function StoreContact({
  className,
  itemClassName,
}: {
  className?: string
  itemClassName?: string
}) {
  const { phone, whatsapp } = getStoreContact()
  if (!phone && !whatsapp) {
    return null
  }

  const t = await getTranslations("common")

  return (
    <ul className={className} data-testid="store-contact">
      {whatsapp && (
        <li className={itemClassName}>
          <a
            className="hover:text-ui-fg-base"
            href={whatsapp.href}
            target="_blank"
            rel="noreferrer"
            data-testid="store-contact-whatsapp"
          >
            {t("whatsapp")}: <span dir="ltr">{whatsapp.label}</span>
          </a>
        </li>
      )}
      {phone && (
        <li className={itemClassName}>
          <a
            className="hover:text-ui-fg-base"
            href={phone.href}
            data-testid="store-contact-phone"
          >
            {t("phone")}: <span dir="ltr">{phone.label}</span>
          </a>
        </li>
      )}
    </ul>
  )
}
