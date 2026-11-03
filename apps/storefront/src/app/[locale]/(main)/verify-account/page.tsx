import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import VerifyAccount from "@modules/account/components/verify-account"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.verify")
  return {
    title: t("title"),
    description: t("meta"),
  }
}

export default async function VerifyAccountPage() {
  const t = await getTranslations("account.verify")

  return (
    <div className="w-full flex justify-center px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-ui-fg-base">{t("verifying")}</p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}
