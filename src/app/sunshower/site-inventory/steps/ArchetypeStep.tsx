'use client'

import { useState } from 'react'
import type { Archetype } from '../types'
import {
  ChoiceCards,
  FieldLabel,
  INPUT,
  PANEL,
  StepIntro,
  type StepProps,
} from './fields'

// Copy source: vault/concepts/landscape-archetypes.md +
// vault/concepts/site-inventory.md §two modes (Rainer & West).

const ARCHETYPE_META: Record<
  Archetype,
  { name: string; reads: string; means: string }
> = {
  grassland: {
    name: 'Grassland',
    reads: 'Open and all-herbaceous — reads as meadow or prairie.',
    means:
      'Your palette leans meadow: grasses and wildflowers, flower-rich or a calm sea of green.',
  },
  woodland_shrubland: {
    name: 'Woodland & shrubland',
    reads: 'Scattered trees or shrubs with open sky between them.',
    means:
      'Your palette is layered and tiered — shrubs and small trees with sunny openings between.',
  },
  forest: {
    name: 'Forest',
    reads: 'A closed canopy overhead, open underneath the trunks.',
    means:
      'Your palette lives on the forest floor: shade-lovers, ferns, sedges, early-spring bloomers.',
  },
  edge: {
    name: 'Edge',
    reads: 'A transition — open ground meeting a wooded or shrubby boundary.',
    means:
      'Often the right read for a suburban lot: a blended palette that screens and softens boundaries.',
  },
}

export default function ArchetypeStep({ profile, updateProfile }: StepProps) {
  const chosen = profile.archetype?.value
  const [keyOpen, setKeyOpen] = useState(!chosen)
  const [hasWoody, setHasWoody] = useState<'yes' | 'no' | undefined>()
  const [canopy, setCanopy] = useState<'open' | 'closed' | undefined>()
  const [transition, setTransition] = useState<'yes' | 'no' | undefined>()

  function setArchetype(value: Archetype) {
    updateProfile({ archetype: { ...profile.archetype, value } })
    setKeyOpen(false)
  }

  // The landscape-selection key (Rainer & West): woody structure → canopy →
  // transition. Edge overrides when the site straddles two archetypes.
  const keyResult: Archetype | null =
    transition === 'yes'
      ? 'edge'
      : hasWoody === 'no' && transition === 'no'
        ? 'grassland'
        : hasWoody === 'yes' && canopy && transition === 'no'
          ? canopy === 'open'
            ? 'woodland_shrubland'
            : 'forest'
          : null

  return (
    <section>
      <StepIntro
        why={
          <>
            Before any measuring, feel the site. Every yard — even a bare one —
            already contains a fragment of a wild landscape that wants to be
            expressed: a grassland, a woodland, a forest, or an edge between
            them. Reading that <em>goal archetype</em> now anchors every plant
            choice later.
          </>
        }
        task={
          <p>
            Wander your yard with no agenda and notice what pulls you in and
            what pushes you away — those reactions are design data. Then squint:
            blur past the details to the bones — tree cover, open ground, where
            water goes.
          </p>
        }
      />

      {chosen && !keyOpen && (
        <div className={PANEL + ' mb-5 p-5'}>
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-800/80">
            Your goal archetype
          </p>
          <h3 className="mt-1 font-serif text-2xl text-[#2a1d10]">
            {ARCHETYPE_META[chosen].name}
          </h3>
          <p className="mt-1 text-sm text-[#2a1d10]/75">
            {ARCHETYPE_META[chosen].reads}
          </p>
          <p className="mt-2 text-sm text-[#2a1d10]/85">
            {ARCHETYPE_META[chosen].means}
          </p>
          <button
            type="button"
            onClick={() => {
              setHasWoody(undefined)
              setCanopy(undefined)
              setTransition(undefined)
              setKeyOpen(true)
            }}
            className="mt-3 text-sm text-[#2a1d10]/60 underline-offset-4 hover:text-[#2a1d10] hover:underline"
          >
            Re-run the key
          </button>
        </div>
      )}

      {keyOpen && (
        <div className="mb-5 space-y-5">
          <div>
            <FieldLabel>
              1 · Squint at your yard and what surrounds it
            </FieldLabel>
            <ChoiceCards
              name="woody structure"
              value={hasWoody}
              onChange={(v) => {
                setHasWoody(v)
                if (v === 'no') setCanopy(undefined)
              }}
              options={[
                {
                  value: 'no',
                  label: 'No trees or shrubs — open and herbaceous',
                  hint: 'Lawn, weeds, bare ground; sky all the way down.',
                },
                {
                  value: 'yes',
                  label: 'Trees or shrubs are part of the picture',
                  hint: 'On your lot or leaning in from next door — they count.',
                },
              ]}
            />
          </div>

          {hasWoody === 'yes' && (
            <div>
              <FieldLabel>2 · Look up — how does the canopy read?</FieldLabel>
              <ChoiceCards
                name="canopy"
                value={canopy}
                onChange={setCanopy}
                options={[
                  {
                    value: 'open',
                    label: 'Open — sky and space between the trees',
                    hint: 'Scattered trees and shrubs, sun reaching the ground.',
                  },
                  {
                    value: 'closed',
                    label: 'Closed — a roof of leaves overhead',
                    hint: 'Shaded ground, open visually beneath the trunks.',
                  },
                ]}
              />
            </div>
          )}

          {(hasWoody === 'no' || canopy) && (
            <div>
              <FieldLabel>
                {hasWoody === 'no' ? '2' : '3'} · Is your yard a transition
                zone?
              </FieldLabel>
              <ChoiceCards
                name="transition"
                value={transition}
                onChange={setTransition}
                options={[
                  {
                    value: 'no',
                    label: 'No — it reads as one thing',
                    hint: 'Mostly open, or mostly wooded, throughout.',
                  },
                  {
                    value: 'yes',
                    label: 'Yes — open ground meets a wooded boundary',
                    hint: 'A lawn against a tree line, a fence row of shrubs, a road edge.',
                  },
                ]}
              />
            </div>
          )}

          {keyResult && (
            <div className={PANEL + ' p-5'}>
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-800/80">
                Your site reads as
              </p>
              <h3 className="mt-1 font-serif text-2xl text-[#2a1d10]">
                {ARCHETYPE_META[keyResult].name}
              </h3>
              <p className="mt-2 text-sm text-[#2a1d10]/85">
                {ARCHETYPE_META[keyResult].means}
              </p>
              <button
                type="button"
                onClick={() => setArchetype(keyResult)}
                className="mt-4 rounded-md bg-[#2a1d10] px-4 py-2.5 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18]"
              >
                That fits — save it
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>What drew you in? (optional)</FieldLabel>
          <textarea
            value={profile.archetype?.draws ?? ''}
            onChange={(e) =>
              chosen &&
              updateProfile({
                archetype: { ...profile.archetype!, draws: e.target.value },
              })
            }
            disabled={!chosen}
            placeholder="A view, a sheltered corner, morning light on the fence…"
            rows={3}
            className={INPUT + ' resize-y disabled:opacity-50'}
          />
        </div>
        <div>
          <FieldLabel>What pushed you away? (optional)</FieldLabel>
          <textarea
            value={profile.archetype?.repels ?? ''}
            onChange={(e) =>
              chosen &&
              updateProfile({
                archetype: { ...profile.archetype!, repels: e.target.value },
              })
            }
            disabled={!chosen}
            placeholder="A dank corner, a junk pile, a spot that feels exposed…"
            rows={3}
            className={INPUT + ' resize-y disabled:opacity-50'}
          />
        </div>
      </div>
      {!chosen && (
        <p className="mt-2 text-xs text-[#2a1d10]/55">
          Answer the key above first — pulls and repels attach to your
          archetype.
        </p>
      )}
    </section>
  )
}
