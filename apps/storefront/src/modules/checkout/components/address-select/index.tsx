"use client"

import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react"
import { ChevronUpDown } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { Fragment, useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"

import compareAddresses from "@lib/util/compare-addresses"
import { governorateName } from "@lib/data/governorates"
import { formatSyrianPhone } from "@lib/util/phone"
import { HttpTypes } from "@medusajs/types"
import Radio from "@modules/common/components/radio"

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[]
  addressInput: HttpTypes.StoreCartAddress | null
  onSelect: (
    address: HttpTypes.StoreCartAddress | undefined,
    email?: string
  ) => void
}

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
}: AddressSelectProps) => {
  const t = useTranslations("address")
  const locale = useLocale()

  const handleSelect = (id: string) => {
    const savedAddress = addresses.find((a) => a.id === id)
    if (savedAddress) {
      onSelect(savedAddress as unknown as HttpTypes.StoreCartAddress)
    }
  }

  const selectedAddress = useMemo(() => {
    return addresses.find(
      (a) => addressInput && compareAddresses(a, addressInput)
    )
  }, [addresses, addressInput])

  return (
    <Listbox onChange={handleSelect} value={selectedAddress?.id}>
      <div className="relative">
        <ListboxButton
          className="relative w-full flex justify-between items-center px-4 py-[10px] text-start bg-white cursor-default focus:outline-none border rounded-rounded focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-gray-300 focus-visible:ring-offset-2 focus-visible:border-gray-300 text-base-regular"
          data-testid="shipping-address-select"
        >
          {({ open }) => (
            <>
              <span className="block truncate">
                {selectedAddress
                  ? `${governorateName(selectedAddress.province, locale)} · ${selectedAddress.city}`
                  : t("chooseAddress")}
              </span>
              <ChevronUpDown
                className={clx("transition-rotate duration-200", {
                  "transform rotate-180": open,
                })}
              />
            </>
          )}
        </ListboxButton>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions
            className="absolute z-20 w-full overflow-auto text-small-regular bg-white border border-top-0 max-h-60 focus:outline-none sm:text-sm"
            data-testid="shipping-address-options"
          >
            {addresses.map((address) => {
              return (
                <ListboxOption
                  key={address.id}
                  value={address.id}
                  className="cursor-default select-none relative ps-6 pe-10 hover:bg-gray-50 py-4"
                  data-testid="shipping-address-option"
                >
                  <div className="flex gap-x-4 items-start">
                    <Radio
                      checked={selectedAddress?.id === address.id}
                      data-testid="shipping-address-radio"
                    />
                    <div className="flex flex-col">
                      <span className="text-start text-base-semi">
                        {address.first_name} {address.last_name}
                      </span>
                      <div className="flex flex-col text-start text-base-regular mt-2">
                        <span>
                          {governorateName(address.province, locale)}
                          {address.city && `, ${address.city}`}
                        </span>
                        {address.address_1 && <span>{address.address_1}</span>}
                        {address.address_2 && (
                          <span>
                            {t("landmarkShort")}: {address.address_2}
                          </span>
                        )}
                        {address.phone && (
                          <span dir="ltr" className="text-ui-fg-subtle">
                            {formatSyrianPhone(address.phone)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </ListboxOption>
              )
            })}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  )
}

export default AddressSelect
