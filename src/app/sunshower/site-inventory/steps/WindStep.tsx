'use client'

import type { Cardinal } from '../types'
import {
  ChoiceCards,
  ChoicePills,
  FieldLabel,
  NotesInput,
  StepIntro,
  type StepProps,
} from './fields'

// Copy source: vault/concepts/site-inventory.md §wind
// (sheltered vs. exposed via littleterracedhouse source).

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

export default function WindStep({ profile, updateProfile }: StepProps) {
  const wind = profile.wind

  return (
    <section>
      <StepIntro
        why={
          <>
            Wind decides where delicate plants can live, where a screen would
            earn its keep, and where sitting outside actually feels good. Much
            of the US runs west-to-east, but coastal California has its own
            patterns — trust what you observe over the rule of thumb.
          </>
        }
        task={
          <p>
            Stand in a few corners of the yard. Where do you feel the breeze
            on your face? Do any trees, flags, or tall weeds lean one way?
            Note which corners feel sheltered and which feel exposed.
          </p>
        }
      />

      <div className="space-y-5">
        <div>
          <FieldLabel>Overall exposure</FieldLabel>
          <ChoiceCards
            name="wind exposure"
            value={wind?.exposure}
            onChange={(exposure) =>
              updateProfile({ wind: { ...wind, exposure } })
            }
            options={[
              {
                value: 'sheltered',
                label: 'Sheltered',
                hint: 'Fences, buildings, or trees break most of the wind.',
              },
              {
                value: 'moderate',
                label: 'Somewhere in between',
                hint: 'A breeze moves through, but nothing struggles against it.',
              },
              {
                value: 'exposed',
                label: 'Exposed',
                hint: 'Wind sweeps through freely; plants and people feel it.',
              },
            ]}
          />
        </div>

        <div>
          <FieldLabel>Prevailing direction, if you know it (optional)</FieldLabel>
          <ChoicePills
            name="wind direction"
            value={wind?.direction}
            onChange={(direction) =>
              wind?.exposure &&
              updateProfile({ wind: { ...wind, direction } })
            }
            options={CARDINALS}
          />
          {!wind?.exposure && (
            <p className="mt-1.5 text-xs text-[#2a1d10]/55">
              Pick an exposure first.
            </p>
          )}
        </div>

        <NotesInput
          value={wind?.notes}
          onChange={(notes) =>
            wind?.exposure && updateProfile({ wind: { ...wind, notes } })
          }
          placeholder="“NW corner gets gusty in the afternoon”"
        />
      </div>
    </section>
  )
}
