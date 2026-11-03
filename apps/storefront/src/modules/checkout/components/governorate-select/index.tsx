"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"

import { GOVERNORATES } from "@lib/data/governorates"
import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select"

/**
 * The 14 Syrian governorates (ISO 3166-2:SY). The value is the lowercase code
 * Medusa stores in `province` and matches service zones on (`sy-di`).
 */
const GovernorateSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ placeholder, defaultValue, ...props }, ref) => {
    const t = useTranslations("address")
    const locale = useLocale()
    const innerRef = useRef<HTMLSelectElement>(null)

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    )

    return (
      <NativeSelect
        ref={innerRef}
        placeholder={placeholder ?? t("selectGovernorate")}
        defaultValue={defaultValue}
        {...props}
      >
        {GOVERNORATES.map((governorate) => (
          <option key={governorate.code} value={governorate.code}>
            {locale === "ar" ? governorate.ar : governorate.en}
          </option>
        ))}
      </NativeSelect>
    )
  }
)

GovernorateSelect.displayName = "GovernorateSelect"

export default GovernorateSelect
