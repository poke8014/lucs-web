'use client'

// Search — PlantPicker-pattern autocomplete over the FULL 309-plant corpus
// (natives + invasives; accepts anything by design). Every result row shows its
// tier badge BEFORE tap (🟢 Native here / 🔴 Invasive here / "Not in our book
// yet"). Selecting opens the detail drawer. Single-select (unlike cleanup-plan's
// multi-pick): a search is "look this plant up", not "build a set".

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import PlantThumb from './PlantThumb'
import { searchCorpus } from './search'
import TierBadge, { tierOf } from './TierBadge'

export default function SelectorSearch({
  onSelect,
}: {
  onSelect: (slug: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputId = useId()
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])

  const results = useMemo(() => searchCorpus(query, 12), [query])
  const safeHighlight = results.length
    ? Math.min(highlight, results.length - 1)
    : 0

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    optionRefs.current[safeHighlight]?.scrollIntoView({ block: 'nearest' })
  }, [safeHighlight])

  const showDropdown = open && query.trim().length > 0

  function select(slug: string) {
    onSelect(slug)
    setQuery('')
    setHighlight(0)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight(Math.min(safeHighlight + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(Math.max(safeHighlight - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = results[safeHighlight]
      if (pick) select(pick.plant.slug)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Look up any plant — a native to consider, or one you already grow…"
        className="w-full rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/90 p-3 text-base text-[#2a1d10] placeholder:text-[#2a1d10]/50 focus:border-emerald-800 focus:bg-[#fff6df] focus:outline-none focus:ring-2 focus:ring-emerald-700/30 sm:text-sm"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={listboxId}
      />

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-[#2a1d10]/20 bg-[#fff6df]/95 shadow-lg backdrop-blur-sm">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-[#2a1d10]/60">
              Not in our book yet — we cover South Bay natives plus the Cal-IPC
              invasive list so far. If it&rsquo;s thriving and you love it, that
              counts for a lot.
            </p>
          ) : (
            <ul
              className="max-h-[min(20rem,60dvh)] overflow-y-auto py-1"
              id={listboxId}
              role="listbox"
            >
              {results.map(({ plant: p, matchedOn }, i) => {
                const secondary =
                  matchedOn === p.scientific_name ? null : matchedOn
                return (
                  <li
                    key={p.slug}
                    ref={(el) => {
                      optionRefs.current[i] = el
                    }}
                    role="option"
                    aria-selected={i === safeHighlight}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => select(p.slug)}
                      className={
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-[#2a1d10] ' +
                        (i === safeHighlight ? 'bg-emerald-100/60' : 'bg-transparent')
                      }
                    >
                      <PlantThumb
                        plant={p}
                        className="h-10 w-10 flex-none rounded"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          <span className="italic">{p.scientific_name}</span>
                          {secondary && (
                            <span className="text-[#2a1d10]/70"> · {secondary}</span>
                          )}
                        </span>
                        <span className="mt-0.5 inline-block">
                          <TierBadge tier={tierOf(p)} size="xs" />
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
