'use client'

import {
  ChoiceCards,
  ChoicePills,
  FieldLabel,
  NotesInput,
  StepIntro,
  type StepProps,
} from './fields'

// Copy sources: vault/concepts/soil-basics.md (squeeze test, indicator
// plants, drainage) + vault/sources/gardenersworld-soil-ph (work with the
// pH you have).

export default function SoilStep({ profile, updateProfile }: StepProps) {
  const soil = profile.soil

  function patch(patchValue: Partial<NonNullable<typeof soil>>) {
    updateProfile({ soil: { phClue: 'no_clue', ...soil, ...patchValue } })
  }

  return (
    <section>
      <StepIntro
        why={
          <>
            Soil narrows plant choices more reliably than almost anything
            else — and the good news is you work <em>with</em> the soil you
            have, not against it. Native plants evolved on unamended local
            soil, so a rough read on pH, texture, and drainage is all this
            step needs.
          </>
        }
        task={
          <p>
            Take a walk around the block. Are rhododendrons, azaleas, or
            camellias thriving in nearby yards? That points acidic. Lavender
            and lilac going strong? That points alkaline. Then, back home, dig
            down a few inches, squeeze a moist handful of soil, and see what
            it does.
          </p>
        }
      />

      <div className="space-y-5">
        <div>
          <FieldLabel>Neighborhood pH clue</FieldLabel>
          <ChoiceCards
            name="pH clue"
            value={soil?.phClue}
            onChange={(phClue) => patch({ phClue })}
            options={[
              {
                value: 'acid_indicators',
                label: 'Acid-leaning neighborhood',
                hint: 'Rhododendrons, azaleas, camellias, or conifers thriving nearby.',
              },
              {
                value: 'alkaline_indicators',
                label: 'Alkaline-leaning neighborhood',
                hint: 'Lavender, lilac, or clematis going strong nearby.',
              },
              {
                value: 'no_clue',
                label: 'No clue yet',
                hint: 'Totally fine — a cheap home pH kit can settle it later.',
              },
            ]}
          />
        </div>

        <div>
          <FieldLabel>The squeeze test (optional)</FieldLabel>
          <ChoicePills
            name="texture"
            value={soil?.texture}
            onChange={(texture) => patch({ texture })}
            options={[
              { value: 'sandy', label: 'Falls apart — sandy' },
              { value: 'loamy', label: 'Crumbles, holds a moment — loam' },
              { value: 'clay', label: 'Sticky ball — clay' },
              { value: 'unsure', label: 'Hard to say' },
            ]}
          />
          {!soil?.phClue && (
            <p className="mt-1.5 text-xs text-[#2a1d10]/55">
              Pick a pH clue first — “no clue yet” counts.
            </p>
          )}
        </div>

        <div>
          <FieldLabel>Drainage, if you&rsquo;ve seen it (optional)</FieldLabel>
          <ChoicePills
            name="drainage"
            value={soil?.drainage}
            onChange={(drainage) => patch({ drainage })}
            options={[
              { value: 'fast', label: 'Drains fast' },
              { value: 'ok', label: 'Drains fine' },
              { value: 'slow', label: 'Sits wet' },
            ]}
          />
          <p className="mt-1.5 text-xs text-[#2a1d10]/55">
            Many California natives care more about sharp drainage than rich
            soil.
          </p>
        </div>

        <NotesInput
          value={soil?.notes}
          onChange={(notes) => patch({ notes })}
          placeholder="“Clay by the fence, sandier near the patio”"
        />
      </div>
    </section>
  )
}
