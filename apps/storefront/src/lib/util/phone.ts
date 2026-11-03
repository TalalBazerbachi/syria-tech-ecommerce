/**
 * Syrian mobile numbers: `09XXXXXXXX` locally, `+9639XXXXXXXX` in E.164.
 * The storefront accepts the local form (what people actually type), the
 * international form, and common variations with spaces/dashes/Arabic digits,
 * and always stores `+9639XXXXXXXX`.
 */

const ARABIC_INDIC_ZERO = 0x0660
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0

function toAsciiDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0)
    const base = code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO
    return String(code - base)
  })
}

/**
 * Returns the E.164 number, or `null` when the input is not a Syrian mobile.
 */
export function normalizeSyrianPhone(input: string | null | undefined): string | null {
  if (!input) {
    return null
  }

  const digits = toAsciiDigits(input).replace(/[^\d+]/g, "")

  let national: string | null = null

  if (/^\+?963/.test(digits)) {
    national = digits.replace(/^\+?963/, "")
  } else if (/^00963/.test(digits)) {
    national = digits.slice(5)
  } else if (/^0/.test(digits)) {
    national = digits.slice(1)
  } else if (/^9\d{8}$/.test(digits)) {
    national = digits
  }

  if (!national || !/^9\d{8}$/.test(national)) {
    return null
  }

  return `+963${national}`
}

export function isValidSyrianPhone(input: string | null | undefined): boolean {
  return normalizeSyrianPhone(input) !== null
}

/** `+9639XXXXXXXX` → `09XX XXX XXX` for display. */
export function formatSyrianPhone(e164: string | null | undefined): string {
  const normalized = normalizeSyrianPhone(e164)
  if (!normalized) {
    return e164 ?? ""
  }
  const local = `0${normalized.slice(4)}`
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}
