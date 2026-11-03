"use client"

import React, { useEffect, useActionState } from "react"
import { useTranslations } from "next-intl"

import Input from "@modules/common/components/input"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomer } from "@lib/data/customer"
import { formatSyrianPhone, normalizeSyrianPhone } from "@lib/util/phone"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfilePhone: React.FC<MyInformationProps> = ({ customer }) => {
  const t = useTranslations("account")
  const ta = useTranslations("address")
  const [successState, setSuccessState] = React.useState(false)

  const updateCustomerPhone = async (
    _currentState: Record<string, unknown>,
    formData: FormData
  ) => {
    const phone = normalizeSyrianPhone(formData.get("phone") as string)

    if (!phone) {
      return { success: false, error: ta("errors.phoneInvalid") }
    }

    try {
      await updateCustomer({ phone })
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  const [state, formAction] = useActionState(updateCustomerPhone, {
    error: null as string | null,
    success: false,
  })

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label={ta("phone")}
        currentInfo={
          <span dir="ltr" className="font-semibold" data-testid="current-info">
            {customer.phone ? formatSyrianPhone(customer.phone) : t("noPhone")}
          </span>
        }
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error || undefined}
        clearState={clearState}
        data-testid="account-phone-editor"
      >
        <div className="grid grid-cols-1 gap-y-2">
          <Input
            label={ta("phone")}
            name="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            title={ta("phoneHint")}
            autoComplete="tel"
            required
            defaultValue={customer.phone ? formatSyrianPhone(customer.phone) : ""}
            data-testid="phone-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfilePhone
