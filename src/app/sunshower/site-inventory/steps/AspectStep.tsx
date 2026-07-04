'use client'

import { bearingToCardinal } from '../profile'
import type { Cardinal } from '../types'
import {
  ChoicePills,
  FieldLabel,
  INPUT,
  StepIntro,
  type StepProps,
} from './fields'

// Copy source: vault/concepts/site-inventory.md §sun and aspect
// (compass-app technique via littleterracedhouse source).

const CARDINALS: { value: Cardinal; label: string }[] = [
  { value: 'N', label: 'N' },
  { value: 'NE', label: 'NE' },
  { value: 'E', label: 'E' },
  { value: 'SE', label: 'SE' },
  { value: 'S', label: 'S' },
  { value: 'SW', label: 'SW' },
  { value: 'W', label: 'W' },
  { value: 'NW', label: 'NW' },
]

const ASPECT_NOTES: Partial<Record<Cardinal, string>> = {
  S: 'South-facing — warms early and holds heat. Sun-lovers thrive; afternoon heat is the thing to watch.',
  SE: 'Southeast-facing — generous morning and midday sun with a gentler afternoon.',
  SW: 'Southwest-facing — sunny and warm, with the day’s harshest afternoon light.',
  N: 'North-facing — cooler and moister, slower to warm in spring. Shade-tolerant plants feel at home.',
  NE: 'Northeast-facing — soft morning light, cool afternoons.',
  NW: 'Northwest-facing — shaded mornings, late-day sun.',
  E: 'East-facing — gentle morning sun, shaded by afternoon. Easy light for most plants.',
  W: 'West-facing — shaded mornings, then strong afternoon sun in the heat of the day.',
}

export default function AspectStep({ profile, updateProfile }: StepProps) {
  const cardinal = profile.aspect?.cardinal
  const bearing = profile.aspect?.bearingDeg

  function pickCardinal(value: Cardinal) {
    // Direct pick supersedes any earlier compass reading.
    updateProfile({ aspect: { cardinal: value } })
  }

  function setBearing(raw: string) {
    if (raw === '') {
      updateProfile({ aspect: { cardinal } })
      return
    }
    const deg = Number(raw)
    if (!Number.isFinite(deg)) return
    updateProfile({
      aspect: { bearingDeg: deg, cardinal: bearingToCardinal(deg) ?? undefined },
    })
  }

  return (
    <section>
      <StepIntro
        why={
          <>
            Which way your yard faces sets its baseline character.
            South-facing ground warms earlier and runs hotter; north-facing
            stays cooler and moister. Everything else in the inventory sits on
            top of this one reading.
          </>
        }
        task={
          <p>
            Stand at the back of your yard facing out toward the open side.
            Which way are you looking? If you want precision, open your
            phone&rsquo;s compass app from the same spot and note the bearing.
          </p>
        }
      />

      <div className="space-y-5">
        <div>
          <FieldLabel>Facing direction</FieldLabel>
          <ChoicePills
            name="aspect"
            value={cardinal}
            onChange={pickCardinal}
            options={CARDINALS}
          />
        </div>

        <div>
          <FieldLabel>Compass bearing (optional, 0–360°)</FieldLabel>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={360}
            value={bearing ?? ''}
            onChange={(e) => setBearing(e.target.value)}
            placeholder="e.g. 205"
            className={INPUT + ' max-w-[10rem]'}
          />
          <p className="mt-1.5 text-xs text-[#2a1d10]/55">
            Entering a bearing fills in the direction for you.
          </p>
        </div>

        {cardinal && ASPECT_NOTES[cardinal] && (
          <p className="rounded-md border border-emerald-800/25 bg-emerald-800/10 px-4 py-3 text-sm text-emerald-900">
            {ASPECT_NOTES[cardinal]}
          </p>
        )}
      </div>
    </section>
  )
}
