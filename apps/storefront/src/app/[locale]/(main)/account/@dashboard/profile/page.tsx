import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import ProfilePhone from "@modules/account/components/profile-phone"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import { retrieveCustomer } from "@lib/data/customer"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account")
  return {
    title: t("profile"),
    description: t("profileMeta"),
  }
}

export default async function Profile() {
  const t = await getTranslations("account")
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("profile")}</h1>
        <p className="text-base-regular">{t("profileIntro")}</p>
      </div>
      <div className="flex flex-col gap-y-8 w-full">
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
      </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}
