'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import PhotoLightbox from './PhotoLightbox'
import PlantPicker from './PlantPicker'
import { plantBySlug } from './resolver'
import { buildPlan, buildSummary, type CleanupSummary } from './plan'
import { thumbUrl } from './photoUrl'
import type { Match, Pick, Plant, ResolvedRow } from './types'
import { isYardState, type YardState } from '../yardState'

type Step = 'input' | 'confirm' | 'plan'

type Framing = {
  eyebrow: string
  heading: React.ReactNode
  description: string
}

const DEFAULT_FRAMING: Framing = {
  eyebrow: 'Pollinator Garden — Phase 1: Cleanup',
  heading: (
    <>
      Build a weed-removal
      <br />
      plan for your yard.
    </>
  ),
  description:
    "Pick the plants you've identified in your yard (iNaturalist is the easiest tool for spotting them) from the Cal-IPC top-tier invasive list, confirm with photos, and we'll propose a removal order.",
}

const PARTIAL_FRAMING: Framing = {
  eyebrow: 'Pollinator Garden — Selective cleanup',
  heading: (
    <>
      Selective cleanup around
      <br />
      what you&rsquo;re keeping.
    </>
  ),
  description:
    "Pick the unwanted plants among your existing planting and we'll propose a removal order that's mindful of working around plants you want to keep.",
}

function framingFor(state: YardState | null): Framing {
  return state === 'partial' ? PARTIAL_FRAMING : DEFAULT_FRAMING
}

const PANEL =
  'rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/85 shadow-sm backdrop-blur-sm'
const PANEL_INSET = PANEL + ' p-4'
const PANEL_LARGE = PANEL + ' p-5'

const RATING_LABEL: Record<string, string> = {
  high: 'Cal-IPC High',
  moderate: 'Cal-IPC Moderate',
  limited: 'Cal-IPC Limited',
  watch: 'Cal-IPC Watch',
  alert: 'Cal-IPC Alert',
}

const RATING_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-900 border-red-300',
  moderate: 'bg-orange-100 text-orange-900 border-orange-300',
  limited: 'bg-amber-100 text-amber-900 border-amber-300',
  watch: 'bg-stone-100 text-stone-700 border-stone-300',
  alert: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
}

const CONFIDENCE_LABEL: Record<Match['confidence'], string> = {
  exact: 'Exact match',
  partial: 'Partial match',
  fuzzy: 'Closest match',
}

function rowFromPick(plant: Plant, matchedOn: string): ResolvedRow {
  return {
    id: crypto.randomUUID(),
    rawInput: matchedOn,
    candidates: [{ plant, confidence: 'exact', matchedOn }],
    selectedSlug: plant.slug,
    status: 'kept',
  }
}

export default function CleanupPlanPage() {
  return (
    <Suspense fallback={null}>
      <CleanupPlanInner />
    </Suspense>
  )
}

function CleanupPlanInner() {
  const searchParams = useSearchParams()
  const yardParam = searchParams.get('yard')
  const yardState: YardState | null = isYardState(yardParam) ? yardParam : null
  const framing = framingFor(yardState)

  const [step, setStep] = useState<Step>('input')
  const [picks, setPicks] = useState<Pick[]>([])
  const [rows, setRows] = useState<ResolvedRow[]>([])

  function startConfirm() {
    if (picks.length === 0) return
    const newRows = picks
      .map((pick) => {
        const plant = plantBySlug(pick.slug)
        return plant ? rowFromPick(plant, pick.matchedOn) : null
      })
      .filter((r): r is ResolvedRow => Boolean(r))
    setRows(newRows)
    setStep('confirm')
  }

  function updateRow(id: string, patch: Partial<ResolvedRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function dropRow(id: string) {
    updateRow(id, { status: 'dropped' })
  }

  function pickCandidate(id: string, slug: string) {
    updateRow(id, { selectedSlug: slug, status: 'kept' })
  }

  const keptPlants = useMemo(() => {
    return rows
      .filter((r) => r.status === 'kept' && r.selectedSlug)
      .map((r) => plantBySlug(r.selectedSlug!))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
  }, [rows])

  const plan = useMemo(() => buildPlan(keptPlants), [keptPlants])
  const summary = useMemo(() => buildSummary(keptPlants), [keptPlants])

  function reset() {
    setStep('input')
    setRows([])
    setPicks([])
  }

  const STEP_ORDER: Step[] = ['input', 'confirm', 'plan']

  function canNavigateTo(target: Step): boolean {
    if (target === step) return false
    const targetIdx = STEP_ORDER.indexOf(target)
    const currentIdx = STEP_ORDER.indexOf(step)
    if (targetIdx < currentIdx) return true
    if (targetIdx === currentIdx + 1) {
      if (step === 'input') return picks.length > 0
      if (step === 'confirm') return keptPlants.length > 0
    }
    return false
  }

  function goToStep(target: Step) {
    if (target === 'confirm' && step === 'input') {
      startConfirm()
      return
    }
    if (target === 'input') {
      setPicks(
        rows
          .filter((r) => r.status !== 'dropped' && r.selectedSlug)
          .map((r) => ({ slug: r.selectedSlug!, matchedOn: r.rawInput })),
      )
    }
    setStep(target)
  }

  return (
    <main className="pointer-events-auto absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#2a1d10]/70">
        <Link
          href="/sunshower"
          className="hover:text-[#2a1d10] hover:underline underline-offset-4"
        >
          ← sunshower
        </Link>
        <span className="hidden sm:inline">phase 1 · cleanup</span>
      </div>
      <header className="mb-6 sm:mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-800/80">
          {framing.eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-[0.95] tracking-tight text-[#2a1d10] sm:text-5xl">
          {framing.heading}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#2a1d10]/75 sm:text-base">
          {framing.description}
        </p>
      </header>

      <Stepper
        current={step}
        onNavigate={goToStep}
        canNavigateTo={canNavigateTo}
      />

      {step === 'input' && (
        <InputSection
          selectedPicks={picks}
          onChange={setPicks}
          onSubmit={startConfirm}
        />
      )}

      {step === 'confirm' && (
        <ConfirmSection
          rows={rows}
          onPick={pickCandidate}
          onDrop={dropRow}
          onBack={() => goToStep('input')}
          onContinue={() => setStep('plan')}
          keptCount={keptPlants.length}
        />
      )}

      {step === 'plan' && (
        <PlanSection
          plan={plan}
          summary={summary}
          yardState={yardState}
          onBack={() => setStep('confirm')}
          onReset={reset}
        />
      )}
      </div>
    </main>
  )
}

function Stepper({
  current,
  onNavigate,
  canNavigateTo,
}: {
  current: Step
  onNavigate: (target: Step) => void
  canNavigateTo: (target: Step) => boolean
}) {
  const steps: { id: Step; label: string }[] = [
    { id: 'input', label: '1. Input' },
    { id: 'confirm', label: '2. Confirm' },
    { id: 'plan', label: '3. Plan' },
  ]
  return (
    <ol className="mb-6 flex flex-wrap gap-2 text-sm">
      {steps.map((s) => {
        const isCurrent = s.id === current
        const clickable = canNavigateTo(s.id)
        const base = 'rounded-full border px-3 py-1 transition '
        const style = isCurrent
          ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
          : clickable
            ? 'border-[#2a1d10]/40 bg-[#fff6df]/80 text-[#2a1d10]/75 cursor-pointer hover:border-[#2a1d10] hover:text-[#2a1d10]'
            : 'border-[#2a1d10]/25 bg-[#fff6df]/80 text-[#2a1d10]/40 cursor-not-allowed'
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => clickable && onNavigate(s.id)}
              disabled={!clickable}
              aria-current={isCurrent ? 'step' : undefined}
              className={base + style}
            >
              {s.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function InputSection({
  selectedPicks,
  onChange,
  onSubmit,
}: {
  selectedPicks: Pick[]
  onChange: (picks: Pick[]) => void
  onSubmit: () => void
}) {
  return (
    <section>
      <p className="mb-2 block text-sm font-medium text-[#2a1d10]/80">
        Plants you&rsquo;ve identified in your yard
      </p>
      <PlantPicker selectedPicks={selectedPicks} onChange={onChange} />
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-xs text-[#2a1d10]/60">
          Search by scientific or common name. We&rsquo;ll show photos to
          confirm on the next step.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={selectedPicks.length === 0}
          className="flex-none rounded-md bg-[#2a1d10] px-4 py-2 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18] disabled:cursor-not-allowed disabled:bg-[#2a1d10]/30"
        >
          Confirm picks ({selectedPicks.length})
        </button>
      </div>
    </section>
  )
}

function ConfirmSection({
  rows,
  onPick,
  onDrop,
  onBack,
  onContinue,
  keptCount,
}: {
  rows: ResolvedRow[]
  onPick: (id: string, slug: string) => void
  onDrop: (id: string) => void
  onBack: () => void
  onContinue: () => void
  keptCount: number
}) {
  const visible = rows.filter((r) => r.status !== 'dropped')
  return (
    <section>
      <h2 className="mb-4 font-serif text-2xl text-[#2a1d10]">
        Confirm each match
      </h2>
      <ul className="space-y-4">
        {visible.map((row) => (
          <ConfirmRow key={row.id} row={row} onPick={onPick} onDrop={onDrop} />
        ))}
      </ul>

      {visible.length === 0 && (
        <p className={PANEL + ' p-6 text-[#2a1d10]/70'}>
          No rows left. Go back and add some plant names.
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#2a1d10]/70 hover:text-[#2a1d10]"
        >
          ← Edit list
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={keptCount === 0}
          className="rounded-md bg-[#2a1d10] px-4 py-2 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18] disabled:cursor-not-allowed disabled:bg-[#2a1d10]/30"
        >
          Generate plan ({keptCount})
        </button>
      </div>
    </section>
  )
}

function ConfirmRow({
  row,
  onPick,
  onDrop,
}: {
  row: ResolvedRow
  onPick: (id: string, slug: string) => void
  onDrop: (id: string) => void
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const selected = row.candidates.find((c) => c.plant.slug === row.selectedSlug)
  const photos = selected?.plant.photos ?? []
  const photo = photos[0]

  if (row.candidates.length === 0) {
    return (
      <li className="rounded-lg border border-amber-300/60 bg-amber-50/85 p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm">{row.rawInput}</p>
            <p className="mt-1 text-sm text-amber-900">
              No match in our plant catalog (Cal-IPC invasives, UC IPM
              residential weeds, and South Bay natives). It may be a
              non-native that&rsquo;s not flagged, or outside our coverage so far.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDrop(row.id)}
            className="text-sm text-[#2a1d10]/60 hover:text-[#2a1d10]"
          >
            Drop
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className={PANEL_INSET}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        {photo ? (
          <div className="flex flex-none flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              aria-label={`View photos of ${selected?.plant.scientific_name ?? 'plant'}`}
              className="block overflow-hidden rounded-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(photo.url)}
                alt={selected?.plant.scientific_name ?? ''}
                className="h-32 w-32 object-cover transition hover:opacity-90 sm:h-40 sm:w-40"
                loading="lazy"
              />
            </button>
            {photos.length > 1 && (
              <p className="text-xs text-stone-500">
                {photos.length} photos — click to enlarge
              </p>
            )}
          </div>
        ) : (
          <div className="h-32 w-32 flex-none rounded-md bg-stone-100 sm:h-40 sm:w-40" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 break-words text-xs uppercase tracking-wide text-[#2a1d10]/55">
              You typed: {row.rawInput}
            </p>
            {selected && (
              <span className="flex-none whitespace-nowrap rounded-full bg-[#2a1d10]/10 px-2 py-0.5 text-xs text-[#2a1d10]/70">
                {CONFIDENCE_LABEL[selected.confidence]}
              </span>
            )}
          </div>
          {selected && (
            <p className="mt-1 text-base text-[#2a1d10]">
              <span className="italic">{selected.plant.scientific_name}</span>
              {selected.plant.common_names[0] && (
                <span className="text-[#2a1d10]/70">
                  {' '}
                  · {selected.plant.common_names[0]}
                </span>
              )}
            </p>
          )}
          {selected?.plant.cal_ipc_rating && (
            <span
              className={
                'mt-2 inline-block rounded-full border px-2 py-0.5 text-xs ' +
                RATING_BADGE[selected.plant.cal_ipc_rating]
              }
            >
              {RATING_LABEL[selected.plant.cal_ipc_rating]}
            </span>
          )}
          {row.candidates.length > 1 && (
            <div className="mt-3">
              <label className="text-xs text-[#2a1d10]/60">
                {row.candidates.length} possible matches — pick the one in your
                yard:
              </label>
              <select
                value={row.selectedSlug ?? ''}
                onChange={(e) => onPick(row.id, e.target.value)}
                className="mt-1 block w-full rounded-md border border-[#2a1d10]/25 bg-[#fff6df] p-2 text-base sm:text-sm"
              >
                {row.candidates.map((c) => (
                  <option key={c.plant.slug} value={c.plant.slug}>
                    {c.plant.scientific_name}
                    {c.plant.common_names[0]
                      ? ` — ${c.plant.common_names[0]}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {photo && (
            <p className="mt-2 text-xs text-[#2a1d10]/50">
              Photo: {photo.attribution}
            </p>
          )}
        </div>
        <div className="flex flex-row flex-wrap items-center gap-3 sm:flex-col sm:items-stretch sm:gap-2">
          {row.status === 'unresolved' && row.selectedSlug && (
            <button
              type="button"
              onClick={() => onPick(row.id, row.selectedSlug!)}
              className="rounded-md border border-emerald-800/70 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-50/60"
            >
              Confirm
            </button>
          )}
          {row.status === 'kept' && (
            <span className="rounded-md bg-emerald-100/80 px-3 py-1 text-center text-sm text-emerald-900">
              Kept ✓
            </span>
          )}
          <button
            type="button"
            onClick={() => onDrop(row.id)}
            className="text-sm text-[#2a1d10]/60 hover:text-[#2a1d10]"
          >
            Drop
          </button>
        </div>
      </div>
      {selected && lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          caption={selected.plant.scientific_name}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </li>
  )
}

function PlanSection({
  plan,
  summary,
  yardState,
  onBack,
  onReset,
}: {
  plan: ReturnType<typeof buildPlan>
  summary: CleanupSummary
  yardState: YardState | null
  onBack: () => void
  onReset: () => void
}) {
  const plantCount = plan.reduce((n, g) => n + g.plants.length, 0)
  const hasFragmentSpreader = plan.some((g) =>
    g.plants.some(
      ({ plant }) =>
        plant.safety_flags.includes('fragment_spreader') ||
        plant.spread_mechanisms.some(
          (m) => m === 'rhizomes' || m === 'stolons',
        ),
    ),
  )
  return (
    <section>
      <h2 className="mb-2 font-serif text-2xl text-[#2a1d10]">
        Removal plan — {plan.length} {plan.length === 1 ? 'action' : 'actions'},{' '}
        {plantCount} {plantCount === 1 ? 'plant' : 'plants'}
      </h2>
      <p className={'mb-6 max-w-2xl text-sm text-[#2a1d10]/75 ' + PANEL_INSET}>
        Grouped by removal method so plants needing the same physical action
        share one card. Actions are ordered by Cal-IPC severity of the worst
        plant in each group. Per-plant cautions below each plant are sourced
        from UC Davis WRIC and UC IPM Pest Notes.
      </p>

      <SummarySection summary={summary} />

      <h3 className="mb-3 mt-8 font-serif text-xl text-[#2a1d10]">
        Action plan
      </h3>
      <ol className="space-y-6">
        {plan.map((group, idx) => (
          <li
            key={group.method ?? '__undocumented__'}
            className={PANEL_LARGE}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#2a1d10] text-sm font-medium text-[#f7e9c9]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
                  Action {idx + 1} ·{' '}
                  {group.plants.length === 1
                    ? '1 plant'
                    : `${group.plants.length} plants`}
                </p>
                <h3 className="mt-1 font-serif text-xl leading-snug text-[#2a1d10]">
                  {group.methodLabel}
                </h3>

                <ul className="mt-4 space-y-4">
                  {group.plants.map(({ plant, notes }) => (
                    <li
                      key={plant.slug}
                      className="border-t border-[#2a1d10]/10 pt-4 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start gap-3">
                        {plant.photos[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbUrl(plant.photos[0].url)}
                            alt={plant.scientific_name}
                            className="h-14 w-14 flex-none rounded-md object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[#2a1d10]">
                            <span className="italic">
                              {plant.scientific_name}
                            </span>
                            {plant.common_names[0] && (
                              <span className="text-[#2a1d10]/70">
                                {' '}
                                · {plant.common_names[0]}
                              </span>
                            )}
                          </p>
                          {plant.cal_ipc_rating && (
                            <span
                              className={
                                'mt-1 inline-block rounded-full border px-2 py-0.5 text-xs ' +
                                RATING_BADGE[plant.cal_ipc_rating]
                              }
                            >
                              {RATING_LABEL[plant.cal_ipc_rating]}
                            </span>
                          )}
                          {notes.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#2a1d10]/80">
                              {notes.map((n) => (
                                <li key={n}>{n}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <PrepSection
        yardState={yardState}
        hasFragmentSpreader={hasFragmentSpreader}
      />

      <ComingNextSection />

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#2a1d10]/70 hover:text-[#2a1d10]"
        >
          ← Back to confirm
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/70 px-4 py-2 text-sm font-medium text-[#2a1d10] hover:bg-[#fff6df]"
        >
          Start over
        </button>
      </div>
    </section>
  )
}

// Section 2 — generic, yard-state-driven prep guidance. Intentionally NOT
// per-plant (anti-goal: no plant+photo+method repeating block); the only
// data touch is `hasFragmentSpreader`, which strengthens the disposal line.
function PrepSection({
  yardState,
  hasFragmentSpreader,
}: {
  yardState: YardState | null
  hasFragmentSpreader: boolean
}) {
  const selective = yardState === 'partial'
  return (
    <section className="mt-12">
      <h3 className="mb-3 font-serif text-xl text-[#2a1d10]">
        {selective
          ? 'Prep around what you’re keeping'
          : 'Prep the area for planting'}
      </h3>
      <div className={PANEL_LARGE + ' space-y-4 text-sm text-[#2a1d10]/85'}>
        <p>
          {selective
            ? 'You’re clearing pockets, not the whole yard — get each cleared gap ready for natives without disturbing the plants you’re keeping.'
            : 'Removal is the heavy lifting; this is the hand-off. A short reset between pulling weeds and planting natives is what makes the natives actually take.'}
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Dispose, don’t compost.</strong>{' '}
            {hasFragmentSpreader
              ? 'Several of your plants spread from root or stem fragments — bag all removed material for the landfill. One rhizome piece in a compost or green bin restarts the infestation.'
              : 'Bag removed weed material for the landfill rather than composting or green-binning it — seed and root fragments survive home compost.'}
          </li>
          <li>
            <strong>Leave established trees and keepers alone.</strong>{' '}
            {selective
              ? 'Don’t dig or till inside the dripline of plants you’re keeping — you’ll tear feeder roots. Clear right up to them by hand instead.'
              : 'Mature trees and any desirable plants are structure to design around, not blank slate. Don’t strip the whole yard to bare dirt.'}
          </li>
          <li>
            <strong>Let the seedbank flush.</strong> Water the cleared ground and
            wait 2–4 weeks, then knock back the second germination before you
            plant. This one pass prevents most of the regrowth people blame on
            “the natives not establishing.”
          </li>
          <li>
            <strong>What “ready to plant” looks like:</strong> target
            weeds and live root fragments gone (not every blade of green —
            natives will outcompete the rest), soil loosened but not pulverized,{' '}
            {selective ? 'the cleared gaps' : 'the area'} settled and lightly
            mulched if you have wood chips on hand.
          </li>
        </ul>
      </div>
    </section>
  )
}

// Section 3 — Phase-2 handoff. Yard cleared? The selector is live.
function ComingNextSection() {
  return (
    <section className="mt-10">
      <h3 className="mb-3 font-serif text-xl text-[#2a1d10]">
        Yard cleared? Choose what goes in its place.
      </h3>
      <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/70 p-5 text-sm text-[#2a1d10]/80 backdrop-blur-sm">
        <p>
          Phase 1 (Cleanup) hands off here. The plant selector is where you
          pick California natives matched to your site — 150 species verified
          growing wild within ~10 miles of San Jose, ranked by how well they
          fit your yard&rsquo;s light, water, and soil.
        </p>
        <p className="mt-3">
          Every plant shows what it gives the local food web: which butterflies
          and moths it hosts, which wildlife it shelters, which seasons it
          covers for foragers. Build a saved palette your bed plan will place.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/sunshower/plant-selector"
            className="font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-700"
          >
            Browse the plants that belong here →
          </Link>
          <Link
            href="/sunshower/site-inventory"
            className="font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-700"
          >
            Map your yard first →
          </Link>
          <Link
            href="/sunshower/bed-planner"
            className="font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-700"
          >
            Cleared and ready? Lay out your beds →
          </Link>
        </p>
      </div>
    </section>
  )
}

function SummarySection({ summary }: { summary: CleanupSummary }) {
  const { tools, timing, cautions, followup } = summary
  const hasAnything =
    tools.length > 0 ||
    timing.length > 0 ||
    cautions.length > 0 ||
    followup.length > 0
  if (!hasAnything) return null

  return (
    <div className="mb-2 grid gap-4 sm:grid-cols-2">
      {timing.length > 0 && (
        <SummaryCard title="When to act" icon="📅">
          <ul className="space-y-2">
            {timing.map((g) => (
              <li key={g.window}>
                <p className="text-sm font-medium text-[#2a1d10]">{g.window}</p>
                <p className="text-sm text-[#2a1d10]/75">
                  {g.plants
                    .map(
                      (p) => p.common_name ?? p.scientific_name,
                    )
                    .join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </SummaryCard>
      )}

      {tools.length > 0 && (
        <SummaryCard title="What you'll need" icon="🛠">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#2a1d10]/85">
            {tools.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </SummaryCard>
      )}

      {cautions.length > 0 && (
        <SummaryCard title="Yard-wide cautions" icon="⚠️" tone="warning">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-amber-950/90">
            {cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </SummaryCard>
      )}

      {followup.length > 0 && (
        <SummaryCard title="Multi-year follow-up" icon="⏳">
          <ul className="space-y-2">
            {followup.map((g) => (
              <li key={g.years}>
                <p className="text-sm font-medium text-[#2a1d10]">
                  {g.years}+ years
                </p>
                <p className="text-sm text-[#2a1d10]/75">
                  Sweep annually for{' '}
                  {g.plants
                    .map((p) => p.common_name ?? p.scientific_name)
                    .join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </SummaryCard>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  icon,
  tone = 'neutral',
  children,
}: {
  title: string
  icon: string
  tone?: 'neutral' | 'warning'
  children: React.ReactNode
}) {
  const wrapper =
    tone === 'warning'
      ? 'rounded-lg border border-amber-400/60 bg-amber-50/85 p-4 backdrop-blur-sm'
      : PANEL_INSET
  return (
    <div className={wrapper}>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[#2a1d10]/70">
        <span className="mr-1.5" aria-hidden>
          {icon}
        </span>
        {title}
      </p>
      {children}
    </div>
  )
}
