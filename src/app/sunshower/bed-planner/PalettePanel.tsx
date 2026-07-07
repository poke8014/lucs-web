'use client'

// PalettePanel — compact side-panel picker for the active bed section.
//
// Shows a search box and a ranked plant list filtered by the section's labels.
// Each row carries: plant name, fit level badge, layer-role/kind badge (with
// the heuristic reason on hover/tap), and a mismatch note when the plant was
// down-ranked for moisture or soil.
//
// Props surface is intentionally thin: placement interactions (drawing
// individual/drift/matrixFill on the canvas) belong to unit E.
// `onPick(plant, suggestion)` is the whole outward surface — unit E wires
// it to the canvas state.
//
// Visual idiom follows PlantListView.tsx (plant-selector): stone/amber palette,
// serif headings, rounded-full badges, consistent token classes. Not imported
// wholesale — this is a compact panel, not a full-page browse surface.

import { useState, useDeferredValue } from 'react'
import type { SiteProfile } from '../site-inventory/types'
import type { SelectorPlant } from '../plant-selector/types'
import type { PlacementSuggestion } from './layerRole'
import type { BedSectionLabels, BedPaletteEntry, PlantFirstResult } from './palette'
import { paletteForBedSection, plantFirstLookup } from './palette'

// ── Visual constants ──────────────────────────────────────────────────────────

// Fit level → badge style (mirrors FitRead.tsx tokens).
const FIT_STYLE: Record<string, string> = {
  great: 'border-emerald-800/40 bg-emerald-800/10 text-emerald-900',
  good: 'border-emerald-800/30 bg-emerald-800/5 text-emerald-900/90',
  stretch: 'border-amber-700/40 bg-amber-100/70 text-amber-900',
  mismatch: 'border-orange-400/50 bg-orange-100/70 text-orange-900',
  unknown: 'border-[#2a1d10]/25 bg-[#fff6df]/80 text-[#2a1d10]/70',
}

const FIT_LABEL: Record<string, string> = {
  great: 'great fit',
  good: 'good fit',
  stretch: 'stretch',
  mismatch: 'mismatch',
  unknown: 'unknown',
}

// Layer role → short display label + color (keeps visual weight light).
const LAYER_STYLE: Record<string, { label: string; className: string }> = {
  structural: { label: 'structural', className: 'bg-stone-200/80 text-stone-800 border-stone-300/70' },
  seasonal:   { label: 'seasonal',   className: 'bg-amber-100/70 text-amber-900 border-amber-300/60' },
  groundcover: { label: 'ground cover', className: 'bg-emerald-50 text-emerald-800 border-emerald-300/60' },
  filler:     { label: 'filler',     className: 'bg-sky-50 text-sky-800 border-sky-300/60' },
}

const KIND_LABEL: Record<string, string> = {
  individual: '· individual',
  drift: '· drift',
  matrixFill: '· matrix fill',
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Hover/tap tooltip — shows the heuristic reason when the badge is activated.
// Simple title attribute for desktop; tap-toggle for touch.
function LayerBadge({
  suggestion,
}: {
  suggestion: PlacementSuggestion
}) {
  const [showReason, setShowReason] = useState(false)
  const layer = LAYER_STYLE[suggestion.layerRole]

  return (
    <span className="relative inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        title={suggestion.reason}
        onClick={() => setShowReason((s) => !s)}
        className={[
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
          layer.className,
          suggestion.confidence === 'low' ? 'opacity-75' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {layer.label}
        <span className="text-[10px] opacity-60">{KIND_LABEL[suggestion.kind]}</span>
        {suggestion.confidence === 'low' && (
          <span className="text-[9px] opacity-50">?</span>
        )}
      </button>
      {showReason && (
        <span
          className="absolute right-0 top-full z-10 mt-1 w-52 rounded-md border border-[#2a1d10]/15 bg-[#fff6df] px-3 py-2 text-xs text-[#2a1d10]/80 shadow-md"
          role="tooltip"
        >
          {suggestion.reason}
          {suggestion.confidence === 'low' && (
            <span className="mt-1 block text-[#2a1d10]/50">
              Suggested from plant type — override if you know better.
            </span>
          )}
        </span>
      )}
    </span>
  )
}

// A single plant row in the palette list.
function PlantRow({
  plant,
  fit,
  suggestion,
  labelMismatch,
  onPick,
}: {
  plant: SelectorPlant
  fit: { level: string; reasons: string[] }
  suggestion: PlacementSuggestion
  labelMismatch?: string[]
  onPick: (plant: SelectorPlant, suggestion: PlacementSuggestion) => void
}) {
  const name = plant.common_names[0] ?? plant.scientific_name
  const fitStyle = FIT_STYLE[fit.level] ?? FIT_STYLE.unknown
  const fitLabel = FIT_LABEL[fit.level] ?? 'unknown'

  return (
    <li className="border-t border-[#2a1d10]/8 py-2.5 first:border-t-0">
      <div className="flex items-start justify-between gap-2">
        {/* Name + action */}
        <button
          type="button"
          onClick={() => onPick(plant, suggestion)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-sm font-medium text-[#2a1d10] hover:underline underline-offset-4">
            {name}
          </span>
          {plant.common_names[0] && (
            <span className="font-serif text-xs italic text-[#2a1d10]/50">
              {plant.scientific_name}
            </span>
          )}
        </button>

        {/* Badges: fit + layer role */}
        <div className="flex flex-none flex-col items-end gap-1">
          <span
            title={fit.reasons.join(' ')}
            className={[
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs',
              fitStyle,
            ].join(' ')}
          >
            {fitLabel}
          </span>
          <LayerBadge suggestion={suggestion} />
        </div>
      </div>

      {/* Mismatch note — shown when the plant was down-ranked */}
      {labelMismatch && labelMismatch.length > 0 && (
        <p className="mt-1 text-xs text-amber-800/80">
          {labelMismatch[0]}
        </p>
      )}
    </li>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface PalettePanelProps {
  /** Section environmental labels (sun + moisture + soilTexture). */
  labels: BedSectionLabels
  /** User's site profile; null → fit unknown for all plants. */
  profile: SiteProfile | null
  /** Called when the user picks a plant. Unit E wires this to canvas state. */
  onPick: (plant: SelectorPlant, suggestion: PlacementSuggestion) => void
}

export default function PalettePanel({
  labels,
  profile,
  onPick,
}: PalettePanelProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  // Determine which mode we're in: search (plant-first) or browse.
  const isSearching = deferredQuery.trim().length > 0

  // Browse: full ranked palette for the section.
  const paletteEntries: BedPaletteEntry[] = isSearching
    ? []
    : paletteForBedSection(labels, profile)

  // Search: plant-first lookup.
  const searchResults: PlantFirstResult[] = isSearching
    ? plantFirstLookup(deferredQuery.trim(), labels, profile)
    : []

  const showEmpty =
    !isSearching && paletteEntries.length === 0

  const showNoResults =
    isSearching && deferredQuery.trim().length > 0 && searchResults.length === 0

  return (
    <section
      className="flex h-full flex-col rounded-lg border border-[#2a1d10]/15 bg-[#f7e9c9]/70 shadow-sm"
      aria-label="Plant palette"
    >
      {/* Header */}
      <div className="border-b border-[#2a1d10]/10 px-4 pt-4 pb-3">
        <h2 className="font-serif text-base text-[#2a1d10]">Plants for this section</h2>
        <p className="mt-0.5 text-xs text-[#2a1d10]/55">
          Ranked by fit · tap a plant to place it
        </p>

        {/* Search input */}
        <div className="relative mt-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/90 px-3 py-2 text-sm text-[#2a1d10] placeholder:text-[#2a1d10]/40 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            aria-label="Search plants by name"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2a1d10]/40 hover:text-[#2a1d10]/70"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Plant list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {/* Empty state: no plants match section labels */}
        {showEmpty && (
          <div className="mt-6 rounded-lg border border-dashed border-[#2a1d10]/20 px-4 py-6 text-center text-sm text-[#2a1d10]/60">
            <p>No plants on file for this section yet.</p>
            <p className="mt-1">Try searching by name above.</p>
          </div>
        )}

        {/* No results for this search query */}
        {showNoResults && (
          <div className="mt-6 text-center text-sm text-[#2a1d10]/60">
            <p>No match for &ldquo;{deferredQuery.trim()}&rdquo;.</p>
            <p className="mt-1">Try a common name or genus.</p>
          </div>
        )}

        {/* Search results (plant-first mode) */}
        {isSearching && searchResults.length > 0 && (
          <>
            <p className="mt-3 mb-1 text-xs text-[#2a1d10]/50">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </p>
            <ul>
              {searchResults.map(({ plant, fit, suggestion, labelMismatch }) => (
                <PlantRow
                  key={plant.slug}
                  plant={plant}
                  fit={fit}
                  suggestion={suggestion}
                  labelMismatch={labelMismatch}
                  onPick={onPick}
                />
              ))}
            </ul>
          </>
        )}

        {/* Browse mode: ranked palette */}
        {!isSearching && paletteEntries.length > 0 && (
          <ul className="mt-2">
            {paletteEntries.map(({ plant, fit, suggestion, labelMismatch }) => (
              <PlantRow
                key={plant.slug}
                plant={plant}
                fit={fit}
                suggestion={suggestion}
                labelMismatch={labelMismatch}
                onPick={onPick}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
