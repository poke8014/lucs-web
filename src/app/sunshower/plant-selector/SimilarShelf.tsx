'use client'

// The suggestion shelf — the nudge, tier by tier (spec §"The nudge ladder"):
//
//   🟢 native            "More like this" — companions + similar natives, always
//                        shown, celebratory. Not dismissible (it's not a nudge,
//                        it's the payoff).
//   🟡 non_native_safe   ONE gentle offer with a dismiss control: "If you'd like
//                        more like it — these natives share its vibe." Dismissal
//                        is remembered per-plant (selectorPrefs) and NEVER
//                        repeated after. No shame, no counting (§Anti-goals).
//   🔴 invasive          REDIRECT to native stand-ins for the role it plays
//                        ("love pampas plumes? deergrass gives the movement
//                        without the escape"). A redirect, not a nag — not
//                        dismissible-gated.
//   unknown              Optional browse shelf of profile-fit natives, clearly
//                        labeled as browse (NOT analogs) — no false "similar to".
//
// Uses useSelectorPrefs internally so PlantDrawer's call site is unchanged
// (still <SimilarShelf plant profile onOpen/>). SSR-safe: while prefs are
// un-hydrated we render the shelf (default = not dismissed), and the effect
// reconciles after mount — a dismissed shelf never flashes back permanently.

import { nativePlants } from './corpus'
import { rankForBrowse } from './ranking'
import { similarNatives } from './similar'
import type { SiteProfile } from '../site-inventory/types'
import PlantThumb from './PlantThumb'
import { tierOf } from './TierBadge'
import type { SelectorPlant, SimilarResult } from './types'
import { useSelectorPrefs } from './useSelectorPrefs'

// Presentational row — shared by every tier's shelf.
function ShelfRow({
  plant,
  reason,
  onOpen,
}: {
  plant: SelectorPlant
  reason?: string
  onOpen: (slug: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(plant.slug)}
        className="flex w-full items-center gap-3 rounded-md border border-[#2a1d10]/15 bg-[#fff6df]/70 p-2 text-left hover:border-emerald-800/40 hover:bg-[#fff6df]"
      >
        <PlantThumb plant={plant} className="h-11 w-11 flex-none rounded" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-[#2a1d10]">
            {plant.common_names[0] ?? plant.scientific_name}
          </span>
          <span className="block truncate font-serif text-xs italic text-[#2a1d10]/70">
            {plant.scientific_name}
          </span>
          {reason && (
            <span className="block truncate text-xs text-emerald-900/70">{reason}</span>
          )}
        </span>
        <span aria-hidden className="flex-none text-[#2a1d10]/40">
          →
        </span>
      </button>
    </li>
  )
}

function Shelf({
  heading,
  blurb,
  results,
  onOpen,
  action,
}: {
  heading: string
  blurb?: string
  results: SimilarResult[]
  onOpen: (slug: string) => void
  action?: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-1 font-serif text-lg text-[#2a1d10]">{heading}</h3>
      {blurb && <p className="mb-2 text-sm text-[#2a1d10]/75">{blurb}</p>}
      <ul className="space-y-1.5">
        {results.map(({ plant, reasons }) => (
          <ShelfRow key={plant.slug} plant={plant} reason={reasons[0]} onOpen={onOpen} />
        ))}
      </ul>
      {action}
    </section>
  )
}

export default function SimilarShelf({
  plant,
  profile,
  onOpen,
}: {
  plant: SelectorPlant
  profile: SiteProfile | null
  onOpen: (slug: string) => void
}) {
  const { dismissed, dismiss, restore } = useSelectorPrefs()
  const tier = tierOf(plant)

  // ── unknown — a browse shelf, honestly labeled (not "similar to"). ────────
  // We can't compute similarity for a plant we have no data on; if there's a
  // profile we can still offer profile-fit natives to explore.
  if (tier === 'unknown') {
    if (!profile) return null
    const browse = rankForBrowse(nativePlants(), profile, undefined).slice(0, 6)
    if (browse.length === 0) return null
    return (
      <Shelf
        heading="Natives worth a look"
        blurb="Not related to this plant — just natives that suit your yard, if you’d like to browse."
        results={browse.map((p) => ({ plant: p, reasons: [] }))}
        onOpen={onOpen}
      />
    )
  }

  const results = similarNatives(plant, undefined, profile)
  if (results.length === 0) return null

  // ── 🟢 native — the payoff shelf. Always shown, celebratory framing. ──────
  if (tier === 'native') {
    return <Shelf heading="More like this" results={results} onOpen={onOpen} />
  }

  // ── 🔴 invasive — REDIRECT to native stand-ins for its role. Not gated. ───
  if (tier === 'invasive') {
    const label = plant.common_names[0] ?? plant.scientific_name
    return (
      <Shelf
        heading="Native plants that play the same role"
        blurb={`If you love what ${label} does in the garden, these natives give you the look without the escape.`}
        results={results}
        onOpen={onOpen}
      />
    )
  }

  // ── 🟡 non_native_safe — one gentle, dismissible offer. ───────────────────
  // Once dismissed for this plant, the shelf never returns for it.
  if (dismissed(plant.slug)) {
    // A quiet, non-nagging way back — no count, no guilt, easy to ignore.
    return (
      <button
        type="button"
        onClick={() => restore(plant.slug)}
        className="text-xs text-[#2a1d10]/45 underline underline-offset-4 hover:text-[#2a1d10]/70"
      >
        Show native look-alikes
      </button>
    )
  }

  return (
    <Shelf
      heading="A few natives with a similar vibe"
      blurb="No need to swap anything — but if you’d like more like it, these share its feel."
      results={results}
      onOpen={onOpen}
      action={
        <button
          type="button"
          onClick={() => dismiss(plant.slug)}
          className="mt-2 text-xs text-[#2a1d10]/45 underline underline-offset-4 hover:text-[#2a1d10]/70"
        >
          No thanks — don’t suggest swaps for this one
        </button>
      }
    />
  )
}
