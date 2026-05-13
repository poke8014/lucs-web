'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { plantBySlug, searchPlants } from './resolver'
import type { Pick, Plant } from './types'

type Props = {
  selectedPicks: Pick[]
  onChange: (picks: Pick[]) => void
}

export default function PlantPicker({ selectedPicks, onChange }: Props) {
  const selectedSlugs = useMemo(
    () => selectedPicks.map((p) => p.slug),
    [selectedPicks],
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputId = useId()
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedPlants = useMemo(
    () =>
      selectedSlugs
        .map((slug) => plantBySlug(slug))
        .filter((p): p is Plant => Boolean(p)),
    [selectedSlugs],
  )

  const results = useMemo(
    () =>
      searchPlants(query, 12).filter((r) => !selectedSlugs.includes(r.plant.slug)),
    [query, selectedSlugs],
  )

  const safeHighlight = results.length
    ? Math.min(highlight, results.length - 1)
    : 0

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function add(slug: string, matchedOn: string) {
    if (selectedSlugs.includes(slug)) return
    onChange([...selectedPicks, { slug, matchedOn }])
    setQuery('')
    setHighlight(0)
    setOpen(false)
  }

  function remove(slug: string) {
    onChange(selectedPicks.filter((p) => p.slug !== slug))
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
      if (pick) add(pick.plant.slug, pick.matchedOn)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={containerRef} className="relative">
      {selectedPlants.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {selectedPlants.map((p) => (
            <li
              key={p.slug}
              className="flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-50/80 py-1 pl-1 pr-2 text-sm text-[#2a1d10] backdrop-blur-sm"
            >
              {p.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photos[0].url}
                  alt=""
                  className="h-6 w-6 flex-none rounded-full object-cover"
                />
              ) : (
                <span className="h-6 w-6 flex-none rounded-full bg-[#2a1d10]/15" />
              )}
              <span className="italic">{p.scientific_name}</span>
              {p.common_names[0] && (
                <span className="text-[#2a1d10]/70">
                  · {p.common_names[0]}
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove ${p.scientific_name}`}
                onClick={() => remove(p.slug)}
                className="ml-1 rounded-full px-1.5 text-[#2a1d10]/60 hover:bg-emerald-100/80 hover:text-[#2a1d10]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

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
        placeholder="Type a plant name — e.g. fennel, blackberry, Cytisus…"
        className="w-full rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/90 p-3 text-sm text-[#2a1d10] placeholder:text-[#2a1d10]/50 focus:border-emerald-800 focus:bg-[#fff6df] focus:outline-none"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={listboxId}
      />

      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-[#2a1d10]/20 bg-[#fff6df]/95 shadow-lg backdrop-blur-sm">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-[#2a1d10]/60">
              No match in the Cal-IPC top-tier list (137 plants). It may be a
              native, a non-native that&rsquo;s not flagged as invasive, or
              outside our coverage so far.
            </p>
          ) : (
            <ul
              className="max-h-80 overflow-y-auto"
              id={listboxId}
              role="listbox"
            >
              {results.map(({ plant: p, matchedOn }, i) => {
                const secondary =
                  matchedOn === p.scientific_name ? null : matchedOn
                return (
                  <li
                    key={p.slug}
                    role="option"
                    aria-selected={i === safeHighlight}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => add(p.slug, matchedOn)}
                      className={
                        'flex w-full items-center gap-3 p-2 text-left text-[#2a1d10] ' +
                        (i === safeHighlight
                          ? 'bg-emerald-100/60'
                          : 'bg-transparent')
                      }
                    >
                      {p.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photos[0].url}
                          alt=""
                          className="h-10 w-10 flex-none rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="h-10 w-10 flex-none rounded bg-[#2a1d10]/10" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          <span className="italic">{p.scientific_name}</span>
                          {secondary && (
                            <span className="text-[#2a1d10]/70">
                              {' '}
                              · {secondary}
                            </span>
                          )}
                        </span>
                        {p.cal_ipc_rating && (
                          <span className="text-xs text-[#2a1d10]/60">
                            Cal-IPC {p.cal_ipc_rating}
                          </span>
                        )}
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
