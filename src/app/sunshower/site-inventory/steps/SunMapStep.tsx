'use client'

import { useState } from 'react'
import type { SunTier, SunZone } from '../types'
import {
  ChoicePills,
  FieldLabel,
  INPUT,
  PANEL,
  StepIntro,
  type StepProps,
} from './fields'

// Copy source: vault/concepts/site-inventory.md §hourly-photo method
// (SummerWinds) + vault/concepts/sun-requirements.md 5-tier vocabulary.

const TIERS: { value: SunTier; label: string }[] = [
  { value: 'full_sun', label: 'Full sun' },
  { value: 'morning_sun_afternoon_shade', label: 'Morning sun, afternoon shade' },
  { value: 'morning_shade_afternoon_sun', label: 'Morning shade, afternoon sun' },
  { value: 'dappled_shade', label: 'Dappled shade' },
  { value: 'full_shade', label: 'Full shade' },
]

export const TIER_LABEL: Record<SunTier, string> = Object.fromEntries(
  TIERS.map((t) => [t.value, t.label]),
) as Record<SunTier, string>

export default function SunMapStep({ profile, updateProfile }: StepProps) {
  const zones = profile.sunZones
  const [newLabel, setNewLabel] = useState('')

  function setZones(sunZones: SunZone[]) {
    updateProfile({ sunZones })
  }

  function addZone() {
    const label = newLabel.trim()
    if (!label) return
    setZones([
      ...zones,
      { id: crypto.randomUUID(), label, tier: 'full_sun' },
    ])
    setNewLabel('')
  }

  function patchZone(id: string, patch: Partial<SunZone>) {
    setZones(zones.map((z) => (z.id === id ? { ...z, ...patch } : z)))
  }

  function removeZone(id: string) {
    setZones(zones.filter((z) => z.id !== id))
  }

  return (
    <section>
      <StepIntro
        why={
          <>
            The sun map is the single highest-value piece of your inventory —
            and it&rsquo;s not just hours per day. Morning sun is gentle;
            inland-California afternoon sun is the harshest light a plant will
            face. Mapping <em>when</em> each area gets sun is what makes plant
            matching work later.
          </>
        }
        task={
          <div className="space-y-1.5">
            <p>
              On a sunny day, set a phone alarm for every hour from about 8am
              to 8pm. Each time it rings, take a wide photo of the yard from
              the same spot. At day&rsquo;s end, flip through the photos and
              watch the shade move — then name each distinct area below and
              give it a sun tier.
            </p>
            <p className="text-emerald-900/90">
              This one spans a whole day — feel free to skip ahead and come
              back tomorrow. Your zones save as you go.
            </p>
          </div>
        }
      />

      {zones.length === 0 && (
        <div className={PANEL + ' mb-5 p-5 text-center'}>
          <p className="font-serif text-lg text-[#2a1d10]">No zones yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#2a1d10]/70">
            A zone is any patch that gets its own pattern of light — “back
            fence bed,” “strip by the driveway.” Most yards have 2–5. Add your
            first one below, even a guess; you can refine after the photo day.
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {zones.map((zone) => (
          <li key={zone.id} className={PANEL + ' p-4'}>
            <div className="flex items-start justify-between gap-3">
              <input
                type="text"
                value={zone.label}
                onChange={(e) => patchZone(zone.id, { label: e.target.value })}
                aria-label="Zone name"
                className="w-full border-b border-transparent bg-transparent font-serif text-lg text-[#2a1d10] focus:border-[#2a1d10]/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeZone(zone.id)}
                className="flex-none text-sm text-[#2a1d10]/50 hover:text-[#2a1d10]"
              >
                Remove
              </button>
            </div>
            <div className="mt-3">
              <ChoicePills
                name={`sun tier for ${zone.label}`}
                value={zone.tier}
                onChange={(tier) => patchZone(zone.id, { tier })}
                options={TIERS}
              />
            </div>
            <input
              type="text"
              value={zone.notes ?? ''}
              onChange={(e) => patchZone(zone.id, { notes: e.target.value })}
              placeholder="Notes — “shaded by the oak after 3pm” (optional)"
              className={INPUT + ' mt-3'}
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addZone()}
          placeholder="Name a zone — “back fence bed”"
          className={INPUT}
        />
        <button
          type="button"
          onClick={addZone}
          disabled={!newLabel.trim()}
          className="flex-none rounded-md bg-[#2a1d10] px-4 py-2 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18] disabled:cursor-not-allowed disabled:bg-[#2a1d10]/30"
        >
          Add zone
        </button>
      </div>
    </section>
  )
}
