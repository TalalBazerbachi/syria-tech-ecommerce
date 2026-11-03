"use client"

import { MagnifyingGlass } from "@medusajs/icons"
import { useCallback, useEffect, useRef, useState } from "react"
import type { SearchClient } from "instantsearch.js"
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch"
import { useTranslations } from "next-intl"

import { trackProductListViewed } from "@lib/analytics/track"
import useSearchSettled from "@lib/hooks/use-search-settled"
import useToggleState from "@lib/hooks/use-toggle-state"
import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"
import { Text } from "@modules/common/components/ui"
import SearchDrawer from "./drawer"
import SearchHit, { ProductHit } from "./hit"

const HITS_PER_PAGE = 12
const DEBOUNCE_MS = 250

const SearchPanel = ({ onNavigate }: { onNavigate: () => void }) => {
  const t = useTranslations("search")
  const timer = useRef<number | undefined>(undefined)

  const queryHook = useCallback(
    (nextQuery: string, search: (value: string) => void) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => search(nextQuery), DEBOUNCE_MS)
    },
    []
  )

  const { query, refine } = useSearchBox({ queryHook })
  const { items } = useHits<ProductHit>()
  const { status, error, results } = useInstantSearch()
  const { isSettled } = useSearchSettled()

  const [inputValue, setInputValue] = useState(query)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // `Product List Viewed` (search) once per settled, non-empty query.
  const trimmedQuery = query.trim()
  const resultCount = results?.nbHits ?? items.length
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!isSettled || status === "error" || !trimmedQuery) {
      return
    }
    if (lastTracked.current === trimmedQuery) {
      return
    }
    lastTracked.current = trimmedQuery
    trackProductListViewed({
      list_id: "search",
      query: trimmedQuery,
      result_count: resultCount,
    })
  }, [isSettled, status, trimmedQuery, resultCount])

  const hasInput = Boolean(inputValue.trim())
  const isPending = inputValue.trim() !== query.trim()
  const hasResults = Boolean(query.trim()) && items.length > 0

  return (
    <>
      <div className="flex items-center gap-x-3 border-b border-ui-border-base px-4">
        <MagnifyingGlass className="shrink-0 text-ui-fg-muted" />
        <input
          type="search"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value)
            refine(event.target.value)
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          autoFocus
          className="txt-medium w-full bg-transparent py-4 text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
          data-testid="search-input"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasInput ? (
          <Text
            className="px-4 py-6 text-center text-ui-fg-muted"
            data-testid="search-empty"
          >
            {t("startTyping")}
          </Text>
        ) : status === "error" ? (
          <Text
            className="px-4 py-6 text-center text-ui-fg-error"
            data-testid="search-error"
          >
            {t("error")}
            {error?.message ? `: ${error.message}` : "."}
          </Text>
        ) : !isSettled ? (
          <Text
            className="px-4 py-6 text-center text-ui-fg-muted"
            data-testid="search-loading"
          >
            {t("searching")}
          </Text>
        ) : hasResults ? (
          <ul className="py-2" data-testid="search-results">
            {items.map((hit) => (
              <SearchHit key={hit.objectID} hit={hit} onNavigate={onNavigate} />
            ))}
          </ul>
        ) : isPending || !query.trim() ? (
          <Text
            className="px-4 py-6 text-center text-ui-fg-muted"
            data-testid="search-loading"
          >
            {t("searching")}
          </Text>
        ) : (
          <Text
            className="px-4 py-6 text-center text-ui-fg-subtle"
            data-testid="search-no-results"
          >
            {t("noResults", { query })}
          </Text>
        )}
      </div>
    </>
  )
}

const Search = () => {
  const t = useTranslations("search")
  const { state: isOpen, open, close } = useToggleState()

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t("placeholder")}
        className="flex items-center hover:text-ui-fg-base"
        data-testid="nav-search-button"
      >
        <MagnifyingGlass />
      </button>

      <SearchDrawer isOpen={isOpen} close={close}>
        <InstantSearch
          indexName={PRODUCT_INDEX_NAME}
          searchClient={searchClient as unknown as SearchClient}
          future={{ preserveSharedStateOnUnmount: true }}
        >
          <Configure hitsPerPage={HITS_PER_PAGE} />
          <SearchPanel onNavigate={close} />
        </InstantSearch>
      </SearchDrawer>
    </>
  )
}

export default Search
