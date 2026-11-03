"use client"

import React from "react"
import { useTranslations } from "next-intl"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

/**
 * Read-only: Medusa's Store API has no customer e-mail update, and the e-mail
 * is the login identity. Shown for completeness next to name and phone.
 */
const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  const t = useTranslations("account")

  return (
    <form className="w-full" onSubmit={(e) => e.preventDefault()}>
      <AccountInfo
        label={t("email")}
        currentInfo={<span dir="ltr" className="font-semibold" data-testid="current-info">{customer.email}</span>}
        isSuccess={false}
        isError={false}
        clearState={() => undefined}
        data-testid="account-email-editor"
      >
        <p className="text-small-regular text-ui-fg-subtle">{t("emailReadOnly")}</p>
      </AccountInfo>
    </form>
  )
}

export default ProfileEmail
