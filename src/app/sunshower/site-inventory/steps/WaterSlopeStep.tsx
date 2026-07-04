'use client'

import {
  ChoiceCards,
  ChoicePills,
  FieldLabel,
  INPUT,
  NotesInput,
  StepIntro,
  type StepProps,
} from './fields'

// Copy source: vault/concepts/site-inventory.md §topography.

export default function WaterSlopeStep({ profile, updateProfile }: StepProps) {
  const ws = profile.waterSlope

  return (
    <section>
      <StepIntro
        why={
          <>
            Where water goes is where planting decisions get made for you.
            Spots where rain pools want different plants than a slope it races
            off of — and knowing what the hose reaches decides how far from
            the spigot young plants can live while they establish.
          </>
        }
        task={
          <p>
            The easy version: walk the yard right after a rain and watch where
            water sits and where it runs. No rain coming? Run a hose for a few
            minutes at the high side and follow it. While you&rsquo;re out
            there, check how far the hose actually reaches.
          </p>
        }
      />

      <div className="space-y-5">
        <div>
          <FieldLabel>How does the ground lie?</FieldLabel>
          <ChoiceCards
            name="grade"
            value={ws?.grade}
            onChange={(grade) =>
              updateProfile({
                waterSlope: { hoseReach: 'all', ...ws, grade },
              })
            }
            options={[
              { value: 'flat', label: 'Flat', hint: 'No real grade to speak of.' },
              {
                value: 'gentle',
                label: 'Gentle slope',
                hint: 'You notice it, water notices it more.',
              },
              {
                value: 'steep',
                label: 'Steep',
                hint: 'Enough that you would think about terracing.',
              },
              {
                value: 'mixed',
                label: 'Mixed',
                hint: 'Flat in places, sloped in others.',
              },
            ]}
          />
        </div>

        <div>
          <FieldLabel>Where does rain sit? (optional)</FieldLabel>
          <input
            type="text"
            value={ws?.poolingSpots ?? ''}
            onChange={(e) =>
              ws?.grade &&
              updateProfile({
                waterSlope: { ...ws, poolingSpots: e.target.value },
              })
            }
            disabled={!ws?.grade}
            placeholder="“Low corner by the shed stays wet for a day”"
            className={INPUT + ' disabled:opacity-50'}
          />
        </div>

        <div>
          <FieldLabel>Does the hose reach?</FieldLabel>
          <ChoicePills
            name="hose reach"
            value={ws?.hoseReach}
            onChange={(hoseReach) =>
              ws?.grade && updateProfile({ waterSlope: { ...ws, hoseReach } })
            }
            options={[
              { value: 'all', label: 'The whole yard' },
              { value: 'partial', label: 'Part of it' },
              { value: 'none', label: 'Not really' },
            ]}
          />
          {!ws?.grade && (
            <p className="mt-1.5 text-xs text-[#2a1d10]/55">
              Pick a grade first.
            </p>
          )}
        </div>

        <NotesInput
          value={ws?.notes}
          onChange={(notes) =>
            ws?.grade && updateProfile({ waterSlope: { ...ws, notes } })
          }
          placeholder="“Downspout dumps by the patio”"
        />
      </div>
    </section>
  )
}
