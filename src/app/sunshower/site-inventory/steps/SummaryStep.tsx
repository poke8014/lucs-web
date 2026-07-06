'use client'

import Link from 'next/link'
import { completedStepCount, STEP_IDS } from '../profile'
import type { SiteProfile, StepId } from '../types'
import { PANEL } from './fields'
import { TIER_LABEL } from './SunMapStep'
import { KIND_LABEL } from './SightlinesStep'

const ARCHETYPE_NAME = {
  grassland: 'Grassland',
  woodland_shrubland: 'Woodland & shrubland',
  forest: 'Forest',
  edge: 'Edge',
} as const

const EXPOSURE_LABEL = {
  sheltered: 'Sheltered',
  moderate: 'In between',
  exposed: 'Exposed',
} as const

const GRADE_LABEL = {
  flat: 'Flat',
  gentle: 'Gentle slope',
  steep: 'Steep',
  mixed: 'Mixed',
} as const

const HOSE_LABEL = {
  all: 'hose reaches everywhere',
  partial: 'hose reaches part of the yard',
  none: 'hose doesn’t really reach',
} as const

const PH_LABEL = {
  acid_indicators: 'Acid-leaning (neighborhood indicators)',
  alkaline_indicators: 'Alkaline-leaning (neighborhood indicators)',
  no_clue: 'No pH read yet',
} as const

const CALLED_811_LABEL = {
  done: '811 lines marked',
  scheduled: '811 visit scheduled',
  not_yet: '811 not called yet',
} as const

export default function SummaryStep({
  profile,
  onEditStep,
  onReset,
}: {
  profile: SiteProfile
  onEditStep: (id: StepId) => void
  onReset: () => void
}) {
  const doneCount = completedStepCount(profile)

  return (
    <section>
      <p className="mb-5 text-sm text-[#2a1d10]/80 sm:text-base">
        Here&rsquo;s what your yard offers — {doneCount} of {STEP_IDS.length}{' '}
        dimensions mapped. This profile is the input side of{' '}
        <em>right plant, right place</em>: conditions first, plants matched to
        them. It&rsquo;s saved in this browser; refine it anytime.
      </p>

      <div className="space-y-3">
        <SummaryRow
          title="Goal archetype"
          stepId="archetype"
          status={profile.steps.archetype}
          onEdit={onEditStep}
        >
          {profile.archetype ? (
            <>
              <p className="font-medium">
                {ARCHETYPE_NAME[profile.archetype.value]}
              </p>
              {profile.archetype.draws && (
                <p className="mt-0.5">Draws you: {profile.archetype.draws}</p>
              )}
              {profile.archetype.repels && (
                <p className="mt-0.5">Repels you: {profile.archetype.repels}</p>
              )}
            </>
          ) : null}
        </SummaryRow>

        <SummaryRow
          title="Aspect"
          stepId="aspect"
          status={profile.steps.aspect}
          onEdit={onEditStep}
        >
          {profile.aspect?.cardinal ? (
            <p>
              Faces <span className="font-medium">{profile.aspect.cardinal}</span>
              {profile.aspect.bearingDeg !== undefined &&
                ` (${profile.aspect.bearingDeg}°)`}
            </p>
          ) : null}
        </SummaryRow>

        <SummaryRow
          title="Sun map"
          stepId="sun_map"
          status={profile.steps.sun_map}
          onEdit={onEditStep}
        >
          {profile.sunZones.length > 0 ? (
            <ul className="space-y-1">
              {profile.sunZones.map((z) => (
                <li key={z.id}>
                  <span className="font-medium">{z.label}</span> —{' '}
                  {TIER_LABEL[z.tier].toLowerCase()}
                  {z.notes && (
                    <span className="text-[#2a1d10]/60"> · {z.notes}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </SummaryRow>

        <SummaryRow
          title="Wind"
          stepId="wind"
          status={profile.steps.wind}
          onEdit={onEditStep}
        >
          {profile.wind ? (
            <p>
              {EXPOSURE_LABEL[profile.wind.exposure]}
              {profile.wind.direction && `, mostly from the ${profile.wind.direction}`}
              {profile.wind.notes && (
                <span className="text-[#2a1d10]/60"> · {profile.wind.notes}</span>
              )}
            </p>
          ) : null}
        </SummaryRow>

        <SummaryRow
          title="Water & slope"
          stepId="water_slope"
          status={profile.steps.water_slope}
          onEdit={onEditStep}
        >
          {profile.waterSlope ? (
            <p>
              {GRADE_LABEL[profile.waterSlope.grade]},{' '}
              {HOSE_LABEL[profile.waterSlope.hoseReach]}
              {profile.waterSlope.poolingSpots &&
                ` · pooling: ${profile.waterSlope.poolingSpots}`}
              {profile.waterSlope.notes && (
                <span className="text-[#2a1d10]/60">
                  {' '}
                  · {profile.waterSlope.notes}
                </span>
              )}
            </p>
          ) : null}
        </SummaryRow>

        <SummaryRow
          title="Utilities"
          stepId="utilities"
          status={profile.steps.utilities}
          onEdit={onEditStep}
        >
          {profile.utilities ? (
            <p>
              {profile.utilities.overheadLines
                ? 'Overhead lines cross the yard'
                : 'No overhead lines'}
              {' · '}
              {CALLED_811_LABEL[profile.utilities.called811]}
              {profile.utilities.fixtures &&
                ` · fixtures: ${profile.utilities.fixtures}`}
            </p>
          ) : null}
        </SummaryRow>

        <SummaryRow
          title="Sightlines"
          stepId="sightlines"
          status={profile.steps.sightlines}
          onEdit={onEditStep}
        >
          {profile.sightlines.length > 0 ? (
            <ul className="space-y-1">
              {profile.sightlines.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{KIND_LABEL[s.kind]}</span> —{' '}
                  {s.description}
                </li>
              ))}
            </ul>
          ) : null}
        </SummaryRow>

        <SummaryRow
          title="Soil clues"
          stepId="soil"
          status={profile.steps.soil}
          onEdit={onEditStep}
        >
          {profile.soil ? (
            <p>
              {PH_LABEL[profile.soil.phClue]}
              {profile.soil.texture &&
                profile.soil.texture !== 'unsure' &&
                ` · ${profile.soil.texture}`}
              {profile.soil.drainage && ` · drains ${profile.soil.drainage === 'ok' ? 'fine' : profile.soil.drainage}`}
              {profile.soil.notes && (
                <span className="text-[#2a1d10]/60"> · {profile.soil.notes}</span>
              )}
            </p>
          ) : null}
        </SummaryRow>
      </div>

      <div className={PANEL + ' mt-6 p-5'}>
        <p className="text-xs uppercase tracking-[0.14em] text-amber-900/85">
          What this unlocks
        </p>
        <p className="mt-2 text-sm text-[#2a1d10]/85">
          This profile is exactly what the plant selector reads: your sun
          zones match against each native plant&rsquo;s sun needs, and your
          goal archetype picks the California plant-community palette —
          meadow, chaparral, oak woodland — that fits your yard&rsquo;s bones.
        </p>
        <p className="mt-3">
          <Link
            href="/sunshower/plant-selector"
            className="text-sm font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-700"
          >
            Browse the plants that belong where you live →
          </Link>
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/sunshower"
            className="text-[#2a1d10]/70 hover:text-[#2a1d10]"
          >
            ← back to sunshower
          </Link>
          <Link
            href="/sunshower/cleanup-plan"
            className="text-[#2a1d10]/70 hover:text-[#2a1d10]"
          >
            Weeds still standing? Build a cleanup plan →
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Clear the whole profile and start over?'))
              onReset()
          }}
          className="text-sm text-[#2a1d10]/50 underline-offset-4 hover:text-[#2a1d10] hover:underline"
        >
          Start over
        </button>
      </div>
    </section>
  )
}

function SummaryRow({
  title,
  stepId,
  status,
  onEdit,
  children,
}: {
  title: string
  stepId: StepId
  status: string
  onEdit: (id: StepId) => void
  children: React.ReactNode
}) {
  const empty = children === null || children === undefined || children === false
  return (
    <div className={PANEL + ' p-4'}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-lg text-[#2a1d10]">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(stepId)}
          className="flex-none text-sm text-[#2a1d10]/60 underline-offset-4 hover:text-[#2a1d10] hover:underline"
        >
          {empty ? 'Map it' : 'Edit'}
        </button>
      </div>
      <div className="mt-1.5 text-sm text-[#2a1d10]/80">
        {empty ? (
          <p className="text-[#2a1d10]/50">
            {status === 'skipped' ? 'Skipped — not mapped yet.' : 'Not mapped yet.'}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
