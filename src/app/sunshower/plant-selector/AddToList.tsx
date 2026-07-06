'use client'

// Add-to-list — wired for real persistence (Unit D).
// Status buttons reflect and toggle the entry's real status in localStorage.
// Optional destination-zone picker pulled from the user's sun zones (read via
// useSiteProfile, hydrate-after-mount). Remove affordance ("not for me") clears
// the entry.

import { useEffect, useState } from 'react'
import { useSiteProfile } from '../site-inventory/useSiteProfile'
import type { PlantListStatus } from './plantList'
import type { SelectorPlant } from './types'
import { usePlantList } from './usePlantList'

const STATUS_LABELS: { value: PlantListStatus; label: string; title: string }[] = [
  {
    value: 'considering',
    label: 'Considering',
    title: 'Save this plant to your list to think about later.',
  },
  {
    value: 'chosen',
    label: 'Chosen',
    title: 'Mark this plant as one you want to grow.',
  },
  {
    value: 'already_have',
    label: 'Already have it',
    title: 'Log a plant already in your yard — it counts toward your garden\'s contribution.',
  },
]

export default function AddToList({ plant }: { plant: SelectorPlant }) {
  const { list, hydrated, addPlant, removePlant, changeStatus, changeZone } =
    usePlantList()
  const { profile, hydrated: profileHydrated } = useSiteProfile()

  // Gate first render on hydration so the server render and client agree
  // (both start showing neutral/disabled state, then activate).
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hydrated && profileHydrated) setReady(true)
  }, [hydrated, profileHydrated])

  const entry = ready
    ? list.entries.find((e) => e.plantSlug === plant.slug)
    : undefined
  const currentStatus = entry?.status ?? null
  const currentZoneId = entry?.zoneId

  const sunZones = profile.sunZones ?? []

  function handleStatusClick(status: PlantListStatus) {
    if (currentStatus === status) {
      // Clicking the active status a second time deselects / removes.
      removePlant(plant.slug)
    } else {
      addPlant(plant.slug, status, currentZoneId)
    }
  }

  function handleZoneChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const zoneId = e.target.value || undefined
    if (currentStatus) {
      changeZone(plant.slug, zoneId)
    }
  }

  return (
    <section className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/60 p-4">
      <h3 className="mb-1 font-serif text-lg text-[#2a1d10]">
        Add to your plant list
      </h3>
      <p className="mb-3 text-sm text-[#2a1d10]/70">
        {currentStatus
          ? 'Tap again to remove, or change your mind.'
          : 'Save it, commit to it, or log one you already grow.'}
      </p>

      {/* Status buttons */}
      <div className="flex flex-wrap gap-2">
        {STATUS_LABELS.map(({ value, label, title }) => {
          const active = currentStatus === value
          return (
            <button
              key={value}
              type="button"
              title={title}
              disabled={!ready}
              onClick={() => handleStatusClick(value)}
              className={[
                'rounded-md border px-3.5 py-2 text-sm transition',
                ready
                  ? active
                    ? 'border-emerald-700 bg-emerald-100/80 text-emerald-900 ring-1 ring-emerald-700/30'
                    : 'border-[#2a1d10]/20 bg-[#fff6df]/50 text-[#2a1d10]/75 hover:border-[#2a1d10]/50 hover:bg-[#fff6df] hover:text-[#2a1d10]'
                  : 'cursor-not-allowed border-[#2a1d10]/15 bg-[#fff6df]/40 text-[#2a1d10]/35',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Zone picker — only shown once added and when the profile has zones */}
      {ready && currentStatus && sunZones.length > 0 && (
        <div className="mt-3">
          <label
            htmlFor={`zone-pick-${plant.slug}`}
            className="mb-1 block text-xs text-[#2a1d10]/60"
          >
            Destination zone (optional)
          </label>
          <select
            id={`zone-pick-${plant.slug}`}
            value={currentZoneId ?? ''}
            onChange={handleZoneChange}
            className="w-full rounded-md border border-[#2a1d10]/20 bg-[#fff6df] px-3 py-2 text-sm text-[#2a1d10] focus:border-[#2a1d10]/50 focus:outline-none"
          >
            <option value="">Anywhere in the yard</option>
            {sunZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Remove affordance */}
      {ready && currentStatus && (
        <button
          type="button"
          onClick={() => removePlant(plant.slug)}
          className="mt-3 text-xs text-[#2a1d10]/50 underline-offset-4 hover:text-[#2a1d10] hover:underline"
        >
          Not for me — remove
        </button>
      )}
    </section>
  )
}
