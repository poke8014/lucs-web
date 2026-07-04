'use client'

import { useState } from 'react'
import type { Sightline } from '../types'
import {
  ChoicePills,
  FieldLabel,
  INPUT,
  PANEL,
  StepIntro,
  type StepProps,
} from './fields'

// Copy source: vault/concepts/site-inventory.md §sightlines and privacy.

const KINDS: { value: Sightline['kind']; label: string }[] = [
  { value: 'highlight', label: 'Love it — frame it' },
  { value: 'disguise', label: 'Want it gone' },
  { value: 'privacy', label: 'Feel watched' },
]

export const KIND_LABEL: Record<Sightline['kind'], string> = {
  highlight: 'Frame it',
  disguise: 'Screen it',
  privacy: 'Privacy',
}

export default function SightlinesStep({ profile, updateProfile }: StepProps) {
  const sightlines = profile.sightlines
  const [kind, setKind] = useState<Sightline['kind']>('highlight')
  const [description, setDescription] = useState('')

  function addSightline() {
    const text = description.trim()
    if (!text) return
    updateProfile({
      sightlines: [
        ...sightlines,
        { id: crypto.randomUUID(), kind, description: text },
      ],
    })
    setDescription('')
  }

  function removeSightline(id: string) {
    updateProfile({ sightlines: sightlines.filter((s) => s.id !== id) })
  }

  return (
    <section>
      <StepIntro
        why={
          <>
            You&rsquo;ll see this garden from inside the house more than from
            in it. Views you love become focal points to frame; views you
            don&rsquo;t become screening jobs; spots where you feel overlooked
            become privacy plantings. This is the one step best done from the
            couch.
          </>
        }
        task={
          <p>
            Walk your windows and your favorite seats — kitchen sink, desk,
            patio chair. From each one: what view do you love, what do you
            wish were gone, and where do you feel watched?
          </p>
        }
      />

      {sightlines.length > 0 && (
        <ul className="mb-5 space-y-2.5">
          {sightlines.map((s) => (
            <li
              key={s.id}
              className={PANEL + ' flex items-start justify-between gap-3 p-4'}
            >
              <div>
                <span className="rounded-full border border-emerald-800/30 bg-emerald-800/10 px-2.5 py-0.5 text-xs uppercase tracking-[0.12em] text-emerald-900/90">
                  {KIND_LABEL[s.kind]}
                </span>
                <p className="mt-1.5 text-sm text-[#2a1d10]/85">
                  {s.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeSightline(s.id)}
                className="flex-none text-sm text-[#2a1d10]/50 hover:text-[#2a1d10]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={PANEL + ' p-4'}>
        <FieldLabel>Add a sightline</FieldLabel>
        <ChoicePills
          name="sightline kind"
          value={kind}
          onChange={setKind}
          options={KINDS}
        />
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSightline()}
            placeholder="“Neighbor’s oak from the kitchen window”"
            className={INPUT}
          />
          <button
            type="button"
            onClick={addSightline}
            disabled={!description.trim()}
            className="flex-none rounded-md bg-[#2a1d10] px-4 py-2 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18] disabled:cursor-not-allowed disabled:bg-[#2a1d10]/30"
          >
            Add
          </button>
        </div>
      </div>
    </section>
  )
}
