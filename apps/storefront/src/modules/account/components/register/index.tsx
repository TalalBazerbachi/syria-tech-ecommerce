"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const t = useTranslations("account")
  const ta = useTranslations("address")
  const tc = useTranslations("common")
  const [message, formAction] = useActionState(signup, null)

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi mb-6">
        {t("becomeMember", { store: tc("storeName") })}
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        {t("registerIntro")}
      </p>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-4 text-center text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          data-testid="register-verification-message"
        >
          {t.rich("verificationSent", {
            email: message.email,
            strong: (chunks) => <strong dir="ltr">{chunks}</strong>,
          })}
        </div>
      )}
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={ta("firstName")}
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label={ta("lastName")}
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label={t("email")}
            name="email"
            required
            type="email"
            dir="ltr"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label={ta("phone")}
            name="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            title={ta("phoneHint")}
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label={t("password")}
            name="password"
            required
            type="password"
            dir="ltr"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          {t("registerTerms", { store: tc("storeName") })}
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          {t("join")}
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("alreadyMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          {t("signIn")}
        </button>
      </span>
    </div>
  )
}

export default Register
