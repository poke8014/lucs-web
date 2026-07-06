// "More like this" — the similar-natives shelf. Renders Unit A's
// similarNatives() ranked list as tappable rows that open the same drawer.
//
// SEAM (Unit C): C owns the nudge behavior — the per-tier framing ("If you'd
// like more like it — these natives share its vibe" for 🟡; role stand-ins for
// 🔴) and the per-plant dismissal memory (sunshower.selectorPrefs.v1) that makes
// the nudge a one-time offer. This component today is a neutral shelf: it shows
// the shelf for every tier with a structural heading. C will branch the heading
// copy on tier, gate rendering on dismissal state, and add the dismiss control.

import { similarNatives } from './similar'
import type { SiteProfile } from '../site-inventory/types'
import PlantThumb from './PlantThumb'
import type { SelectorPlant } from './types'

export default function SimilarShelf({
  plant,
  profile,
  onOpen,
}: {
  plant: SelectorPlant
  profile: SiteProfile | null
  onOpen: (slug: string) => void
}) {
  const results = similarNatives(plant, undefined, profile)
  if (results.length === 0) return null

  // Structural heading (Unit C branches this on tier for the nudge voice).
  const heading = plant.nativity === 'native' ? 'More like this' : 'Native plants with a similar vibe'

  return (
    <section>
      <h3 className="mb-2 font-serif text-lg text-[#2a1d10]">{heading}</h3>
      <ul className="space-y-1.5">
        {results.map(({ plant: p, reasons }) => (
          <li key={p.slug}>
            <button
              type="button"
              onClick={() => onOpen(p.slug)}
              className="flex w-full items-center gap-3 rounded-md border border-[#2a1d10]/15 bg-[#fff6df]/70 p-2 text-left hover:border-emerald-800/40 hover:bg-[#fff6df]"
            >
              <PlantThumb
                plant={p}
                className="h-11 w-11 flex-none rounded"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[#2a1d10]">
                  {p.common_names[0] ?? p.scientific_name}
                </span>
                <span className="block truncate font-serif text-xs italic text-[#2a1d10]/70">
                  {p.scientific_name}
                </span>
                {reasons[0] && (
                  <span className="block truncate text-xs text-emerald-900/70">
                    {reasons[0]}
                  </span>
                )}
              </span>
              <span aria-hidden className="flex-none text-[#2a1d10]/40">
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
