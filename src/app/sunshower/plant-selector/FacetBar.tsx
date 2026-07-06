'use client'

// Facet toggles across the top of the batch area: water-wise / pollinator
// powerhouse / bird-friendly / easy-care (Unit A's FacetKey predicates) + a
// bloom-season picker. AND semantics across active facets (matches
// applyFacets). Neutral, goal-oriented copy — no urgency.

import type { FacetKey } from './facets'

const FACETS: { key: FacetKey; label: string }[] = [
  { key: 'water_wise', label: 'Water-wise' },
  { key: 'pollinator_powerhouse', label: 'Pollinator powerhouse' },
  { key: 'bird_friendly', label: 'Bird-friendly' },
  { key: 'easy_care', label: 'Easy-care' },
]

const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const

export default function FacetBar({
  activeFacets,
  onToggleFacet,
  activeSeasons,
  onToggleSeason,
}: {
  activeFacets: FacetKey[]
  onToggleFacet: (facet: FacetKey) => void
  activeSeasons: string[]
  onToggleSeason: (season: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {FACETS.map(({ key, label }) => {
          const on = activeFacets.includes(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleFacet(key)}
              aria-pressed={on}
              className={
                'rounded-full border px-3 py-1 text-sm transition ' +
                (on
                  ? 'border-emerald-800 bg-emerald-800/10 text-emerald-900'
                  : 'border-[#2a1d10]/25 bg-[#fff6df]/70 text-[#2a1d10]/65 hover:border-[#2a1d10]/50')
              }
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">
          Blooms
        </span>
        {SEASONS.map((season) => {
          const on = activeSeasons.includes(season)
          return (
            <button
              key={season}
              type="button"
              onClick={() => onToggleSeason(season)}
              aria-pressed={on}
              className={
                'rounded-full border px-3 py-1 text-sm capitalize transition ' +
                (on
                  ? 'border-amber-700 bg-amber-100/80 text-amber-900'
                  : 'border-[#2a1d10]/25 bg-[#fff6df]/70 text-[#2a1d10]/65 hover:border-[#2a1d10]/50')
              }
            >
              {season}
            </button>
          )
        })}
      </div>
    </div>
  )
}
