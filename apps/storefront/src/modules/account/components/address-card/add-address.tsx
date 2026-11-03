"use client"

import { Plus } from "@medusajs/icons"
import { Button, Heading } from "@modules/common/components/ui"
import { useActionState, useEffect, useState } from "react"
import { useTranslations } from "next-intl"

import { addCustomerAddress } from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { HttpTypes } from "@medusajs/types"
import AddressFields from "@modules/checkout/components/address-fields"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Modal from "@modules/common/components/modal"

const AddAddress = ({
  addresses: _addresses,
}: {
  region: HttpTypes.StoreRegion
  addresses: HttpTypes.StoreCustomerAddress[]
}) => {
  const t = useTranslations("address")
  const tc = useTranslations("common")
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(addCustomerAddress, {
    success: false,
    error: null,
  } as { success: boolean; error: string | null })

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  return (
    <>
      <button
        className="border border-ui-border-base rounded-rounded p-5 min-h-[220px] h-full w-full flex flex-col justify-between"
        onClick={open}
        data-testid="add-address-button"
      >
        <span className="text-base-semi">{t("newAddress")}</span>
        <Plus />
      </button>

      <Modal isOpen={state} close={close} data-testid="add-address-modal">
        <Modal.Title>
          <Heading className="mb-2">{t("addAddress")}</Heading>
        </Modal.Title>
        <form action={formAction}>
          <Modal.Body>
            <div className="flex flex-col gap-y-2 w-full">
              <AddressFields testIdPrefix="account" />
            </div>
            {formState.error && (
              <div
                className="text-rose-500 text-small-regular py-2"
                data-testid="address-error"
              >
                {formState.error}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6">
              <Button
                type="reset"
                variant="secondary"
                onClick={close}
                className="h-10"
                data-testid="cancel-button"
              >
                {tc("cancel")}
              </Button>
              <SubmitButton data-testid="save-button">{tc("save")}</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default AddAddress
