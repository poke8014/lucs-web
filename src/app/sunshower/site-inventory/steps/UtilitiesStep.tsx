'use client'

import {
  ChoiceCards,
  ChoicePills,
  FieldLabel,
  INPUT,
  PANEL,
  StepIntro,
  type StepProps,
} from './fields'

// Copy source: vault/concepts/site-inventory.md §utilities (+ §physical
// structures for fixtures).

export default function UtilitiesStep({ profile, updateProfile }: StepProps) {
  const utilities = profile.utilities

  function patch(patchValue: Partial<NonNullable<typeof utilities>>) {
    updateProfile({
      utilities: {
        overheadLines: false,
        called811: 'not_yet',
        ...utilities,
        ...patchValue,
      },
    })
  }

  return (
    <section>
      <StepIntro
        why={
          <>
            Utilities set a few quiet boundaries: no tall trees under power
            lines, no digging until buried lines are marked, and fixtures like
            AC units and meters need to stay reachable. Better to know these
            edges now than mid-shovel.
          </>
        }
        task={
          <p>
            Look up — do wires cross the yard? Look around — where are the AC
            unit, spigots, and meters? And before any digging happens, one
            free phone call gets every buried line marked for you.
          </p>
        }
      />

      <div className="space-y-5">
        <div className={PANEL + ' p-5'}>
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-800/80">
            Before you dig
          </p>
          <p className="mt-1.5 text-sm text-[#2a1d10]/85">
            811 is the free national call-before-you-dig line. They send
            someone to mark buried gas, water, and electric — usually within a
            few days.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <a
              href="tel:811"
              className="rounded-md bg-[#2a1d10] px-5 py-2.5 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18]"
            >
              Call 811
            </a>
            <ChoicePills
              name="811 status"
              value={utilities?.called811}
              onChange={(called811) => patch({ called811 })}
              options={[
                { value: 'not_yet', label: 'Not yet' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'done', label: 'Marked' },
              ]}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Overhead lines</FieldLabel>
          <ChoiceCards
            name="overhead lines"
            value={
              utilities === undefined
                ? undefined
                : utilities.overheadLines
                  ? 'yes'
                  : 'no'
            }
            onChange={(v) => patch({ overheadLines: v === 'yes' })}
            options={[
              {
                value: 'no',
                label: 'No wires over the yard',
                hint: 'Trees can grow to full height anywhere.',
              },
              {
                value: 'yes',
                label: 'Wires cross the yard',
                hint: 'Keep tall trees out from under them.',
              },
            ]}
          />
        </div>

        <div>
          <FieldLabel>Fixtures worth flagging (optional)</FieldLabel>
          <input
            type="text"
            value={utilities?.fixtures ?? ''}
            onChange={(e) => patch({ fixtures: e.target.value })}
            placeholder="“AC on the east wall, spigot by the porch, gas meter at the gate”"
            className={INPUT}
          />
        </div>
      </div>
    </section>
  )
}
