'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import BaseMapStep from './BaseMapStep'
import { defaultPlan } from './plan'
import type { GardenPlan } from './types'

// The bed-planner workspace shell. Five steps, freely revisitable via a pill
// nav + `?view=<step>` deep links — a workspace, not a wizard (same pattern as
// the site-inventory walkthrough). Steps 2–5 are placeholders that later units
// replace; only step 1 (base map) is live in this unit.
//
// Plan state is plain React state for now: `useState(defaultPlan)`. The
// integration pass swaps this for unit A's `useGardenPlans` hook without
// touching the steps — each step takes `(plan, onChange)`, so the seam is clean.

const STEPS = [
  { id: 'base-map', label: 'Base map' },
  { id: 'paths', label: 'Paths' },
  { id: 'sections', label: 'Sections' },
  { id: 'plant', label: 'Plant' },
  { id: 'check', label: 'Check' },
] as const

type StepId = (typeof STEPS)[number]['id']
const STEP_IDS = STEPS.map((s) => s.id) as readonly StepId[]

function isStepId(value: string | null): value is StepId {
  return value !== null && (STEP_IDS as readonly string[]).includes(value)
}

export default function BedPlannerClient() {
  return (
    <Suspense fallback={null}>
      <BedPlannerInner />
    </Suspense>
  )
}

function BedPlannerInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const current: StepId = isStepId(viewParam) ? viewParam : 'base-map'

  // One plan in memory for now (persistence + multi-draft forking is unit A's
  // integration pass). defaultPlan() gives the canvas something framed to start.
  const [plan, setPlan] = useState<GardenPlan>(defaultPlan)

  function goToStep(id: StepId) {
    router.replace(`/sunshower/bed-planner?view=${id}`, { scroll: false })
  }

  return (
    <main className="pointer-events-auto absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6 pb-24 sm:py-10">
        <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#2a1d10]/70">
          <Link
            href="/sunshower"
            className="hover:text-[#2a1d10] hover:underline underline-offset-4"
          >
            ← sunshower
          </Link>
          <span className="hidden sm:inline">bed planner</span>
        </div>

        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-800/80">
            Pollinator Garden — Bed planner
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-[0.95] tracking-tight text-[#2a1d10] sm:text-5xl">
            Turn your yard
            <br />
            into a plan.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#2a1d10]/75 sm:text-base">
            Map the space, carve it into sections, and fill them with natives —
            one step at a time, in any order. Nothing here is final; plans always
            change and gardens are never finished.
          </p>
        </header>

        <StepNav current={current} onNavigate={goToStep} />

        <div className="mt-2">
          {current === 'base-map' && <BaseMapStep plan={plan} onChange={setPlan} />}
          {current === 'paths' && (
            <StepPlaceholder
              title="Paths"
              blurb="Draw the paths you already walk, then the ones you'd like — they carve the yard into rooms. Built by a later unit."
            />
          )}
          {current === 'sections' && (
            <StepPlaceholder
              title="Sections"
              blurb="Divide the rooms the paths made into named beds, each with its own conditions, density style, and build season. Built by a later unit."
            />
          )}
          {current === 'plant' && (
            <StepPlaceholder
              title="Plant"
              blurb="Fill each section with natives — placed as individuals, drifts, or matrix fills, with quantities worked out for you. Built by a later unit."
            />
          )}
          {current === 'check' && (
            <StepPlaceholder
              title="Check & preview"
              blurb="A gentle design check keeps the result looking intentional, and a season scrubber shows what's in bloom — and where the shadows fall. Built by a later unit."
            />
          )}
        </div>
      </div>
    </main>
  )
}

function StepNav({
  current,
  onNavigate,
}: {
  current: StepId
  onNavigate: (id: StepId) => void
}) {
  return (
    <div className="mb-2">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        The plan, step by step
      </div>
      <ol className="flex flex-wrap gap-1.5 text-sm">
        {STEPS.map((s, i) => {
          const isCurrent = s.id === current
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onNavigate(s.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={
                  'rounded-full border px-3.5 py-1.5 transition ' +
                  (isCurrent
                    ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                    : 'border-[#2a1d10]/30 bg-[#fff6df]/80 text-[#2a1d10]/70 hover:border-[#2a1d10]/70 hover:text-[#2a1d10]')
                }
              >
                {i + 1}. {s.label}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function StepPlaceholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <section className="rounded-lg border border-dashed border-[#2a1d10]/25 bg-[#fff6df]/60 p-8 text-center">
      <h2 className="font-serif text-2xl text-[#2a1d10]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#2a1d10]/70">{blurb}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#2a1d10]/45">
        Coming soon
      </p>
    </section>
  )
}
