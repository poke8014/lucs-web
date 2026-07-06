'use client'

// A single plant card in a role batch. Photo thumb (graceful no-photo),
// common + scientific name, tier badge, and a one-line fit hint when a profile
// is present. Tapping the card opens the drawer.

import type { SiteProfile } from '../site-inventory/types'
import { fitForZone } from './fit'
import PlantThumb from './PlantThumb'
import TierBadge, { tierOf } from './TierBadge'
import type { SelectorPlant } from './types'

export default function BatchCard({
  plant,
  profile,
  activeZoneId,
  onOpen,
}: {
  plant: SelectorPlant
  profile: SiteProfile | null
  activeZoneId: string | undefined
  onOpen: (slug: string) => void
}) {
  // One-line fit hint — first reason sentence, only when we have a profile.
  const hint =
    profile && activeZoneId
      ? fitForZone(plant, activeZoneId, profile).reasons[0]
      : null

  return (
    <button
      type="button"
      onClick={() => onOpen(plant.slug)}
      className="flex h-full flex-col overflow-hidden rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/80 text-left shadow-sm backdrop-blur-sm transition hover:border-emerald-800/40 hover:shadow-md"
    >
      <PlantThumb plant={plant} className="h-28 w-full" />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="text-sm font-medium leading-tight text-[#2a1d10]">
          {plant.common_names[0] ?? plant.scientific_name}
        </span>
        <span className="font-serif text-xs italic leading-tight text-[#2a1d10]/70">
          {plant.scientific_name}
        </span>
        <span className="mt-auto pt-1">
          <TierBadge tier={tierOf(plant)} size="xs" />
        </span>
        {hint && (
          <span className="text-xs leading-snug text-emerald-900/75">
            {hint}
          </span>
        )}
      </div>
    </button>
  )
}
