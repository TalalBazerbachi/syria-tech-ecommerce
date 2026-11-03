/**
 * Syrian governorates (ISO 3166-2:SY). Single source of truth for the seed
 * (service zones), the storefront address form (governorate dropdown) and any
 * future zone additions. `code` is what goes into Medusa's `address.province`
 * and into fulfillment geo zones (lowercase, as Medusa stores it).
 */
export type Governorate = {
  /** Lowercase ISO 3166-2 code as stored in Medusa (`province`, geo zone). */
  code: string
  /** Canonical ISO 3166-2 code. */
  iso: string
  name_en: string
  name_ar: string
}

export const GOVERNORATES: readonly Governorate[] = [
  { code: "sy-di", iso: "SY-DI", name_en: "Damascus", name_ar: "دمشق" },
  { code: "sy-rd", iso: "SY-RD", name_en: "Rif Dimashq", name_ar: "ريف دمشق" },
  { code: "sy-hl", iso: "SY-HL", name_en: "Aleppo", name_ar: "حلب" },
  { code: "sy-hi", iso: "SY-HI", name_en: "Homs", name_ar: "حمص" },
  { code: "sy-hm", iso: "SY-HM", name_en: "Hama", name_ar: "حماة" },
  { code: "sy-la", iso: "SY-LA", name_en: "Latakia", name_ar: "اللاذقية" },
  { code: "sy-ta", iso: "SY-TA", name_en: "Tartus", name_ar: "طرطوس" },
  { code: "sy-id", iso: "SY-ID", name_en: "Idlib", name_ar: "إدلب" },
  { code: "sy-dr", iso: "SY-DR", name_en: "Daraa", name_ar: "درعا" },
  { code: "sy-su", iso: "SY-SU", name_en: "As-Suwayda", name_ar: "السويداء" },
  { code: "sy-qu", iso: "SY-QU", name_en: "Quneitra", name_ar: "القنيطرة" },
  { code: "sy-dy", iso: "SY-DY", name_en: "Deir ez-Zor", name_ar: "دير الزور" },
  { code: "sy-ra", iso: "SY-RA", name_en: "Raqqa", name_ar: "الرقة" },
  { code: "sy-ha", iso: "SY-HA", name_en: "Al-Hasakah", name_ar: "الحسكة" },
] as const

/** Governorates that get a service zone + shipping option at launch. */
export const LAUNCH_ZONE_CODES: readonly string[] = ["sy-di", "sy-rd"]

export const COUNTRY_CODE = "sy"

export function findGovernorate(code: string): Governorate | undefined {
  const needle = code.toLowerCase()
  return GOVERNORATES.find((g) => g.code === needle)
}
