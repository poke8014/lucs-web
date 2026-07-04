'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import {
  completedStepCount,
  firstUnfinishedStep,
  hasAnyProgress,
  STEP_IDS,
} from './profile'
import type { StepId } from './types'
import { useSiteProfile } from './useSiteProfile'
import ArchetypeStep from './steps/ArchetypeStep'
import AspectStep from './steps/AspectStep'
import SunMapStep from './steps/SunMapStep'
import WindStep from './steps/WindStep'
import WaterSlopeStep from './steps/WaterSlopeStep'
import UtilitiesStep from './steps/UtilitiesStep'
import SightlinesStep from './steps/SightlinesStep'
import SoilStep from './steps/SoilStep'
import SummaryStep from './steps/SummaryStep'

export type WizardStepId = StepId | 'profile'
export type Venue = 'outdoor' | 'indoor' | 'either'

export const STEP_REGISTRY: {
  id: WizardStepId
  title: string
  venue: Venue | null
}[] = [
  { id: 'archetype', title: 'Feel the site', venue: 'outdoor' },
  { id: 'aspect', title: 'Aspect', venue: 'outdoor' },
  { id: 'sun_map', title: 'Sun map', venue: 'either' },
  { id: 'wind', title: 'Wind', venue: 'outdoor' },
  { id: 'water_slope', title: 'Water & slope', venue: 'outdoor' },
  { id: 'utilities', title: 'Utilities', venue: 'either' },
  { id: 'sightlines', title: 'Sightlines', venue: 'indoor' },
  { id: 'soil', title: 'Soil clues', venue: 'outdoor' },
  { id: 'profile', title: 'Your site profile', venue: null },
]

const WIZARD_IDS = STEP_REGISTRY.map((s) => s.id)

function isWizardStepId(value: string | null): value is WizardStepId {
  return value !== null && (WIZARD_IDS as string[]).includes(value)
}

export default function Walkthrough() {
  return (
    <Suspense fallback={null}>
      <WalkthroughInner />
    </Suspense>
  )
}

function WalkthroughInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step')
  const { profile, hydrated, updateProfile, setStepStatus, resetProfile } =
    useSiteProfile()

  const [current, setCurrent] = useState<WizardStepId>(
    isWizardStepId(stepParam) ? stepParam : 'archetype',
  )
  const [resumed, setResumed] = useState(false)
  const scrollRef = useRef<HTMLElement>(null)

  // Resume: with no deep link, land on the first open step of a profile
  // that has progress. Runs once, after localStorage hydration.
  const resumeChecked = useRef(false)
  useEffect(() => {
    if (!hydrated || resumeChecked.current) return
    resumeChecked.current = true
    if (isWizardStepId(stepParam)) return
    if (!hasAnyProgress(profile)) return
    const target = firstUnfinishedStep(profile) ?? 'profile'
    setCurrent(target)
    setResumed(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // A step you're looking at is in progress.
  useEffect(() => {
    if (!hydrated || current === 'profile') return
    if (profile.steps[current] === 'todo') setStepStatus(current, 'in_progress')
  }, [hydrated, current, profile.steps, setStepStatus])

  function goToStep(id: WizardStepId) {
    setCurrent(id)
    setResumed(false)
    router.replace(`/sunshower/site-inventory?step=${id}`, { scroll: false })
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const stepIndex = WIZARD_IDS.indexOf(current)
  const prevId = stepIndex > 0 ? WIZARD_IDS[stepIndex - 1] : null
  const nextId =
    stepIndex < WIZARD_IDS.length - 1 ? WIZARD_IDS[stepIndex + 1] : null
  const doneCount = completedStepCount(profile)

  function finishStep(status: 'done' | 'skipped') {
    if (current !== 'profile') setStepStatus(current, status)
    if (nextId) goToStep(nextId)
  }

  return (
    <main
      ref={scrollRef}
      className="pointer-events-auto absolute inset-0 overflow-y-auto"
    >
      <div className="mx-auto max-w-3xl px-6 py-6 pb-24 sm:py-10">
        <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#2a1d10]/70">
          <Link
            href="/sunshower"
            className="hover:text-[#2a1d10] hover:underline underline-offset-4"
          >
            ← sunshower
          </Link>
          <span className="hidden sm:inline">site inventory</span>
        </div>

        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-800/80">
            Pollinator Garden — Site inventory
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-[0.95] tracking-tight text-[#2a1d10] sm:text-5xl">
            A blank yard is
            <br />
            full of clues.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#2a1d10]/75 sm:text-base">
            Walk your site once with fresh eyes and it will tell you what it
            offers — sun, wind, water, views. Each step below captures one
            clue. Skip anything, come back anytime; your progress saves in
            this browser.
          </p>
        </header>

        <Stepper
          current={current}
          steps={profile.steps}
          doneCount={doneCount}
          onNavigate={goToStep}
        />

        {resumed && (
          <p className="mb-4 rounded-md border border-emerald-800/25 bg-emerald-800/10 px-4 py-2.5 text-sm text-emerald-900">
            Picking up where you left off — {doneCount} of {STEP_IDS.length}{' '}
            steps mapped so far.
          </p>
        )}

        <StepHeading current={current} />

        {current === 'archetype' && (
          <ArchetypeStep profile={profile} updateProfile={updateProfile} />
        )}
        {current === 'aspect' && (
          <AspectStep profile={profile} updateProfile={updateProfile} />
        )}
        {current === 'sun_map' && (
          <SunMapStep profile={profile} updateProfile={updateProfile} />
        )}
        {current === 'wind' && (
          <WindStep profile={profile} updateProfile={updateProfile} />
        )}
        {current === 'water_slope' && (
          <WaterSlopeStep profile={profile} updateProfile={updateProfile} />
        )}
        {current === 'utilities' && (
          <UtilitiesStep profile={profile} updateProfile={updateProfile} />
        )}
        {current === 'sightlines' && (
          <SightlinesStep profile={profile} updateProfile={updateProfile} />
        )}
        {current === 'soil' && (
          <SoilStep profile={profile} updateProfile={updateProfile} />
        )}
        {current === 'profile' && (
          <SummaryStep
            profile={profile}
            onEditStep={goToStep}
            onReset={resetProfile}
          />
        )}

        {current !== 'profile' && (
          <nav className="mt-8 flex items-center justify-between gap-3">
            {prevId ? (
              <button
                type="button"
                onClick={() => goToStep(prevId)}
                className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/70 px-4 py-2.5 text-sm text-[#2a1d10]/80 hover:bg-[#fff6df] hover:text-[#2a1d10]"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => finishStep('skipped')}
                className="px-2 py-2.5 text-sm text-[#2a1d10]/60 underline-offset-4 hover:text-[#2a1d10] hover:underline"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={() => finishStep('done')}
                className="rounded-md bg-[#2a1d10] px-5 py-2.5 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18]"
              >
                {nextId === 'profile' ? 'Done — see profile →' : 'Done — next →'}
              </button>
            </div>
          </nav>
        )}
      </div>
    </main>
  )
}

function StepHeading({ current }: { current: WizardStepId }) {
  const entry = STEP_REGISTRY.find((s) => s.id === current)!
  const n = WIZARD_IDS.indexOf(current) + 1
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="font-serif text-2xl text-[#2a1d10] sm:text-3xl">
        {current === 'profile' ? entry.title : `${n}. ${entry.title}`}
      </h2>
      {entry.venue && <VenueChip venue={entry.venue} />}
    </div>
  )
}

function VenueChip({ venue }: { venue: Venue }) {
  const label = { outdoor: 'outdoor', indoor: 'indoor', either: 'indoor or out' }[
    venue
  ]
  return (
    <span className="rounded-full border border-emerald-800/30 bg-emerald-800/10 px-2.5 py-0.5 text-xs uppercase tracking-[0.12em] text-emerald-900/90">
      {label}
    </span>
  )
}

function Stepper({
  current,
  steps,
  doneCount,
  onNavigate,
}: {
  current: WizardStepId
  steps: Record<StepId, string>
  doneCount: number
  onNavigate: (id: WizardStepId) => void
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        <span>Walkthrough</span>
        <span>
          {doneCount} of {STEP_IDS.length} mapped
        </span>
      </div>
      <ol className="flex flex-wrap gap-1.5 text-sm">
        {STEP_REGISTRY.map((s, i) => {
          const isCurrent = s.id === current
          const isDone = s.id !== 'profile' && steps[s.id] === 'done'
          const style = isCurrent
            ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
            : isDone
              ? 'border-emerald-800/40 bg-emerald-800/10 text-emerald-900 hover:border-emerald-800'
              : 'border-[#2a1d10]/30 bg-[#fff6df]/80 text-[#2a1d10]/70 hover:border-[#2a1d10]/70 hover:text-[#2a1d10]'
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onNavigate(s.id)}
                aria-current={isCurrent ? 'step' : undefined}
                title={s.title}
                className={'rounded-full border px-3 py-1.5 transition ' + style}
              >
                {s.id === 'profile' ? '★' : isDone ? `${i + 1} ✓` : i + 1}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
