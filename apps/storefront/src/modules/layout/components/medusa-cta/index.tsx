import { Text } from "@modules/common/components/ui"
import { useTranslations } from "next-intl"

import Medusa from "../../../common/icons/medusa"
import NextJs from "../../../common/icons/nextjs"

const MedusaCTA = () => {
  const t = useTranslations("common")

  return (
    <Text className="flex gap-x-2 txt-compact-small-plus items-center">
      {t("poweredBy")}
      <a href="https://www.medusajs.com" target="_blank" rel="noreferrer" aria-label="Medusa">
        <Medusa fill="#9ca3af" className="fill-[#9ca3af]" />
      </a>
      &
      <a href="https://nextjs.org" target="_blank" rel="noreferrer" aria-label="Next.js">
        <NextJs fill="#9ca3af" />
      </a>
    </Text>
  )
}

export default MedusaCTA
