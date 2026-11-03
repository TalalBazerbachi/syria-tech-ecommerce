/**
 * Syrian governorates, ISO 3166-2:SY. The `code` is what Medusa stores in
 * `address.province` (lowercase, e.g. `sy-di`) and what service zones match
 * on; keep in sync with `apps/backend/src/data/governorates.ts`.
 */
export type Governorate = {
  /** Lowercase ISO 3166-2 code as stored in Medusa `province`. */
  code: string
  en: string
  ar: string
}

export const GOVERNORATES: readonly Governorate[] = [
  { code: "sy-di", en: "Damascus", ar: "دمشق" },
  { code: "sy-rd", en: "Rif Dimashq", ar: "ريف دمشق" },
  { code: "sy-hl", en: "Aleppo", ar: "حلب" },
  { code: "sy-hi", en: "Homs", ar: "حمص" },
  { code: "sy-hm", en: "Hama", ar: "حماة" },
  { code: "sy-la", en: "Latakia", ar: "اللاذقية" },
  { code: "sy-ta", en: "Tartus", ar: "طرطوس" },
  { code: "sy-id", en: "Idlib", ar: "إدلب" },
  { code: "sy-dr", en: "Daraa", ar: "درعا" },
  { code: "sy-su", en: "As-Suwayda", ar: "السويداء" },
  { code: "sy-qu", en: "Quneitra", ar: "القنيطرة" },
  { code: "sy-dy", en: "Deir ez-Zor", ar: "دير الزور" },
  { code: "sy-ra", en: "Raqqa", ar: "الرقة" },
  { code: "sy-ha", en: "Al-Hasakah", ar: "الحسكة" },
] as const

export const STORE_COUNTRY_CODE = "sy"

export function getGovernorate(code: string | null | undefined): Governorate | undefined {
  if (!code) {
    return undefined
  }
  const normalized = code.toLowerCase()
  return GOVERNORATES.find((g) => g.code === normalized)
}

/** Display name for a stored `province` code in the given UI locale. */
export function governorateName(
  code: string | null | undefined,
  locale: string
): string {
  const governorate = getGovernorate(code)
  if (!governorate) {
    return code ?? ""
  }
  return locale === "ar" ? governorate.ar : governorate.en
}
