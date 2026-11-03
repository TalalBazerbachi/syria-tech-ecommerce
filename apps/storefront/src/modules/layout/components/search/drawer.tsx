"use client"

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { useTranslations } from "next-intl"
import React, { Fragment } from "react"

type SearchDrawerProps = {
  isOpen: boolean
  close: () => void
  children: React.ReactNode
}

const SearchDrawer = ({ isOpen, close, children }: SearchDrawerProps) => {
  const t = useTranslations("search")

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75]" onClose={close}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ui-bg-overlay backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 end-0 flex max-w-full ps-10">
            <TransitionChild
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom="translate-x-full rtl:-translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full rtl:-translate-x-full"
            >
              <DialogPanel
                className="pointer-events-auto w-screen max-w-md"
                data-testid="search-drawer"
              >
                <div className="flex h-full flex-col border-s border-ui-border-base bg-ui-bg-base shadow-elevation-modal">
                  <div className="flex items-center justify-between border-b border-ui-border-base px-4 py-3">
                    <DialogTitle className="text-large-semi text-ui-fg-base">
                      {t("title")}
                    </DialogTitle>
                    <button
                      type="button"
                      onClick={close}
                      aria-label={t("close")}
                      className="text-ui-fg-muted hover:text-ui-fg-base"
                      data-testid="close-search-drawer"
                    >
                      <XMark />
                    </button>
                  </div>
                  {children}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default SearchDrawer
