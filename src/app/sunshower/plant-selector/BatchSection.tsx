'use client'

// One role batch — a small digestible group (~6) of ranked natives for a growth
// role, with a "Show me different ones" reroll that cycles deeper into the
// ranked candidates (fixed windows, no reshuffle chaos). The parent
// (SelectorClient) owns the ranked pool + the per-section window index so the
// reroll state survives re-renders.

import type { SiteProfile } from '../site-inventory/types'
import BatchCard from './BatchCard'
import { batchWindow, ROLE_LABEL, windowCountFor } from './ranking'
import type { RoleBucket, SelectorPlant } from './types'

const BATCH_SIZE = 6

export default function BatchSection({
  role,
  ranked,
  windowIndex,
  onReroll,
  profile,
  activeZoneId,
  onOpen,
}: {
  role: RoleBucket
  ranked: SelectorPlant[]
  windowIndex: number
  onReroll: () => void
  profile: SiteProfile | null
  activeZoneId: string | undefined
  onOpen: (slug: string) => void
}) {
  if (ranked.length === 0) return null
  const shown = batchWindow(ranked, windowIndex, BATCH_SIZE)
  const windows = windowCountFor(ranked.length, BATCH_SIZE)
  const canReroll = windows > 1

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl text-[#2a1d10] sm:text-2xl">
          {ROLE_LABEL[role]}
        </h2>
        {canReroll && (
          <button
            type="button"
            onClick={onReroll}
            className="flex-none text-sm text-emerald-900 underline-offset-4 hover:underline"
          >
            Show me different ones →
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((plant) => (
          <BatchCard
            key={plant.slug}
            plant={plant}
            profile={profile}
            activeZoneId={activeZoneId}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  )
}
