'use client'

// Plant detail drawer — a thin composition of the leaf components. Deep-linkable
// via ?plant=<slug> (the open/close + URL sync lives in SelectorClient; this is
// a pure presentational panel). Mobile: bottom sheet; desktop (sm+): right-side
// panel. One component covers both form factors via responsive classes.
//
// Portaled to <body> so it escapes the backdrop-blur stacking contexts of the
// browse cards (same reasoning as cleanup-plan/PhotoLightbox).

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SiteProfile } from '../site-inventory/types'
import AddToList from './AddToList'
import ContributionCard from './ContributionCard'
import FitRead from './FitRead'
import GrowsWith from './GrowsWith'
import PlantThumb from './PlantThumb'
import SimilarShelf from './SimilarShelf'
import TierBadge, { tierOf } from './TierBadge'
import type { SelectorPlant } from './types'

export default function PlantDrawer({
  plant,
  profile,
  activeZoneId,
  onZoneChange,
  onOpen,
  onClose,
}: {
  plant: SelectorPlant
  profile: SiteProfile | null
  activeZoneId: string | undefined
  onZoneChange: (zoneId: string) => void
  onOpen: (slug: string) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // Portal target gate — avoids SSR hydration mismatch (see PhotoLightbox).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Esc closes; lock body scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!mounted) return null

  const tier = tierOf(plant)
  const photo = plant.photos?.[0]

  const panel = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-stretch sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${plant.common_names[0] ?? plant.scientific_name} details`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#2a1d10]/15 bg-[#f7e9c9] shadow-2xl sm:max-h-none sm:h-full sm:w-[26rem] sm:rounded-none sm:rounded-l-2xl">
        {/* Sticky header with the close control. */}
        <div className="flex items-start justify-between gap-3 border-b border-[#2a1d10]/10 bg-[#f7e9c9]/95 px-5 py-4 backdrop-blur-sm">
          <div className="min-w-0">
            <h2 className="truncate font-serif text-2xl text-[#2a1d10]">
              {plant.common_names[0] ?? plant.scientific_name}
            </h2>
            <p className="truncate font-serif text-sm italic text-[#2a1d10]/70">
              {plant.scientific_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-none rounded-full border border-[#2a1d10]/20 bg-[#fff6df]/70 px-3 py-1 text-xl leading-none text-[#2a1d10]/70 hover:bg-[#fff6df] hover:text-[#2a1d10]"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Photo (iNat display-tier) with attribution, or graceful no-photo. */}
          <div className="overflow-hidden rounded-lg border border-[#2a1d10]/10">
            <PlantThumb plant={plant} className="h-48 w-full" />
            {photo && (
              <p className="bg-[#fff6df]/70 px-3 py-1.5 text-[0.7rem] text-[#2a1d10]/60">
                {photo.attribution}
              </p>
            )}
          </div>

          <TierBadge tier={tier} />

          <FitRead
            plant={plant}
            profile={profile}
            activeZoneId={activeZoneId}
            onZoneChange={onZoneChange}
          />

          <ContributionCard plant={plant} />

          <GrowsWith plant={plant} onOpen={onOpen} />

          <SimilarShelf plant={plant} profile={profile} onOpen={onOpen} />

          <AddToList plant={plant} />
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
