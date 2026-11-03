import { normalizeSyrianPhone } from "@lib/util/phone"

/**
 * Server-side: the store's own phone and WhatsApp numbers, shown in the footer
 * and on the checkout page. Read at request time from `STORE_PHONE` and
 * `STORE_WHATSAPP` (set in infra/.env, passed by docker-compose), so one image
 * serves staging and production. Empty = the link is not rendered.
 */

export type ContactLink = {
  /** As shown to the customer. */
  label: string
  href: string
}

export type StoreContact = {
  phone: ContactLink | null
  whatsapp: ContactLink | null
}

/** Digits with an optional leading `+`, Arabic-Indic digits converted. */
function dialable(input: string): string {
  const ascii = input.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  return ascii.replace(/(?!^\+)[^\d]/g, "")
}

function phoneLink(raw: string | undefined): ContactLink | null {
  const value = raw?.trim()
  if (!value) {
    return null
  }
  // Mobiles become E.164 (works from abroad too); landlines (011 ...) are dialled as entered.
  const number = normalizeSyrianPhone(value) ?? dialable(value)
  return { label: value, href: `tel:${number}` }
}

function whatsappLink(raw: string | undefined): ContactLink | null {
  const value = raw?.trim()
  if (!value) {
    return null
  }
  // wa.me wants the international number, digits only.
  const number = (normalizeSyrianPhone(value) ?? dialable(value)).replace(/^\+/, "")
  if (!number) {
    return null
  }
  return { label: value, href: `https://wa.me/${number}` }
}

export function getStoreContact(): StoreContact {
  return {
    phone: phoneLink(process.env.STORE_PHONE),
    whatsapp: whatsappLink(process.env.STORE_WHATSAPP),
  }
}
