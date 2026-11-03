"use client"

import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"
import { governorateName } from "@lib/data/governorates"
import useToggleState from "@lib/hooks/use-toggle-state"
import { addressNotes } from "@lib/util/address"
import { formatSyrianPhone } from "@lib/util/phone"
import { PencilSquare as Edit, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import AddressFields from "@modules/checkout/components/address-fields"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Modal from "@modules/common/components/modal"
import { Button, Heading, Text, clx } from "@modules/common/components/ui"
import Spinner from "@modules/common/icons/spinner"
import { useLocale, useTranslations } from "next-intl"
import React, { useActionState, useEffect, useState } from "react"

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
}

const EditAddress: React.FC<EditAddressProps> = ({
  address,
  isActive = false,
}) => {
  const t = useTranslations("address")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [removing, setRemoving] = useState(false)
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(updateCustomerAddress, {
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

  const removeAddress = async () => {
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  const notes = addressNotes(address)

  return (
    <>
      <div
        className={clx(
          "border rounded-rounded p-5 min-h-[220px] h-full w-full flex flex-col justify-between transition-colors",
          {
            "border-gray-900": isActive,
          }
        )}
        data-testid="address-container"
      >
        <div className="flex flex-col">
          <Heading
            className="text-start text-base-semi"
            data-testid="address-name"
          >
            {address.first_name} {address.last_name}
          </Heading>
          <Text className="flex flex-col text-start text-base-regular mt-2">
            <span data-testid="address-governorate-city">
              {governorateName(address.province, locale)}
              {address.city && `, ${address.city}`}
            </span>
            {address.address_1 && (
              <span data-testid="address-address">{address.address_1}</span>
            )}
            {address.address_2 && (
              <span data-testid="address-landmark">
                {t("landmarkShort")}: {address.address_2}
              </span>
            )}
            {notes && <span data-testid="address-notes">{t("notesShort")}: {notes}</span>}
            {address.phone && (
              <span dir="ltr" className="text-ui-fg-subtle" data-testid="address-phone">
                {formatSyrianPhone(address.phone)}
              </span>
            )}
          </Text>
        </div>
        <div className="flex items-center gap-x-4">
          <button
            className="text-small-regular text-ui-fg-base flex items-center gap-x-2"
            onClick={open}
            data-testid="address-edit-button"
          >
            <Edit />
            {tc("edit")}
          </button>
          <button
            className="text-small-regular text-ui-fg-base flex items-center gap-x-2"
            onClick={removeAddress}
            data-testid="address-delete-button"
          >
            {removing ? <Spinner /> : <Trash />}
            {tc("remove")}
          </button>
        </div>
      </div>

      <Modal isOpen={state} close={close} data-testid="edit-address-modal">
        <Modal.Title>
          <Heading className="mb-2">{t("editAddress")}</Heading>
        </Modal.Title>
        <form action={formAction}>
          <input type="hidden" name="addressId" value={address.id} />
          <Modal.Body>
            <div className="grid grid-cols-1 gap-y-2 w-full">
              <AddressFields address={address} testIdPrefix="account" />
            </div>
            {formState.error && (
              <div className="text-rose-500 text-small-regular py-2">
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

export default EditAddress
