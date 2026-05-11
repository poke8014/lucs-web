'use client'

import { useMemo, useState } from 'react'
import PhotoLightbox from './PhotoLightbox'
import PlantPicker from './PlantPicker'
import { plantBySlug } from './resolver'
import { buildPlan } from './plan'
import type { Match, Pick, Plant, ResolvedRow } from './types'

type Step = 'input' | 'confirm' | 'plan'

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

  function reset() {
    setStep('input')
    setRows([])
    setPicks([])
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm uppercase tracking-wider text-emerald-700">
          Pollinator Garden — Phase 1: Cleanup
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Build a weed-removal plan for your yard
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          Pick the plants you&rsquo;ve identified in your yard (iNaturalist is
          the easiest tool for spotting them) from the Cal-IPC top-tier
          invasive list, confirm with photos, and we&rsquo;ll propose a
          removal order.
        </p>
      </header>

      <Stepper current={step} />

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
          onBack={() => setStep('input')}
          onContinue={() => setStep('plan')}
          keptCount={keptPlants.length}
        />
      )}

      {step === 'plan' && (
        <PlanSection
          plan={plan}
          onBack={() => setStep('confirm')}
          onReset={reset}
        />
      )}
    </main>
  )
}

function Stepper({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'input', label: '1. Input' },
    { id: 'confirm', label: '2. Confirm' },
    { id: 'plan', label: '3. Plan' },
  ]
  return (
    <ol className="mb-8 flex gap-2 text-sm">
      {steps.map((s) => (
        <li
          key={s.id}
          className={
            'rounded-full border px-3 py-1 ' +
            (current === s.id
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-stone-300 bg-white text-stone-500')
          }
        >
          {s.label}
        </li>
      ))}
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
      <p className="mb-2 block text-sm font-medium text-stone-700">
        Plants you&rsquo;ve identified in your yard
      </p>
      <PlantPicker selectedPicks={selectedPicks} onChange={onChange} />
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-xs text-stone-500">
          Search by scientific or common name. We&rsquo;ll show photos to
          confirm on the next step.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={selectedPicks.length === 0}
          className="flex-none rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
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
      <h2 className="mb-4 text-xl font-semibold">Confirm each match</h2>
      <ul className="space-y-4">
        {visible.map((row) => (
          <ConfirmRow key={row.id} row={row} onPick={onPick} onDrop={onDrop} />
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="rounded-md border border-stone-200 bg-white p-6 text-stone-600">
          No rows left. Go back and add some plant names.
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-600 hover:text-stone-900"
        >
          ← Edit list
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={keptCount === 0}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
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
      <li className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm">{row.rawInput}</p>
            <p className="mt-1 text-sm text-amber-800">
              No match in the Cal-IPC top-tier list (137 plants). It may be a
              native, a non-native that&rsquo;s not flagged as invasive, or
              outside our coverage so far.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDrop(row.id)}
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            Drop
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-4">
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
                src={photo.url}
                alt={selected?.plant.scientific_name ?? ''}
                className="h-40 w-40 object-cover transition hover:opacity-90"
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
          <div className="h-40 w-40 flex-none rounded-md bg-stone-100" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              You typed: {row.rawInput}
            </p>
            {selected && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {CONFIDENCE_LABEL[selected.confidence]}
              </span>
            )}
          </div>
          {selected && (
            <p className="mt-1 text-base">
              <span className="italic">{selected.plant.scientific_name}</span>
              {selected.plant.common_names[0] && (
                <span className="text-stone-600">
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
              <label className="text-xs text-stone-500">
                {row.candidates.length} possible matches — pick the one in your
                yard:
              </label>
              <select
                value={row.selectedSlug ?? ''}
                onChange={(e) => onPick(row.id, e.target.value)}
                className="mt-1 block w-full rounded-md border border-stone-300 bg-white p-2 text-sm"
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
            <p className="mt-2 text-xs text-stone-400">
              Photo: {photo.attribution}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {row.status === 'unresolved' && row.selectedSlug && (
            <button
              type="button"
              onClick={() => onPick(row.id, row.selectedSlug!)}
              className="rounded-md border border-emerald-700 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
            >
              Confirm
            </button>
          )}
          {row.status === 'kept' && (
            <span className="rounded-md bg-emerald-100 px-3 py-1 text-center text-sm text-emerald-900">
              Kept ✓
            </span>
          )}
          <button
            type="button"
            onClick={() => onDrop(row.id)}
            className="text-sm text-stone-500 hover:text-stone-900"
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
  onBack,
  onReset,
}: {
  plan: ReturnType<typeof buildPlan>
  onBack: () => void
  onReset: () => void
}) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-semibold">
        Removal plan ({plan.length})
      </h2>
      <p className="mb-6 max-w-2xl rounded-md border border-stone-200 bg-stone-100 p-4 text-sm text-stone-700">
        Ordered by Cal-IPC rating (highest threat first), then prioritizing
        plants that spread vegetatively (where mowing or pulling can make
        things worse). Detailed per-plant management notes (UC Davis WRIC) are
        coming — for now, methods reflect spread mechanism only.
      </p>

      <ol className="space-y-6">
        {plan.map((item, idx) => (
          <li
            key={item.plant.slug}
            className="rounded-md border border-stone-200 bg-white p-5"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-stone-900 text-sm font-medium text-white">
                {idx + 1}
              </span>
              {item.plant.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.plant.photos[0].url}
                  alt={item.plant.scientific_name}
                  className="h-20 w-20 flex-none rounded-md object-cover"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-base">
                  <span className="italic">{item.plant.scientific_name}</span>
                  {item.plant.common_names[0] && (
                    <span className="text-stone-600">
                      {' '}
                      · {item.plant.common_names[0]}
                    </span>
                  )}
                </p>
                {item.plant.cal_ipc_rating && (
                  <span
                    className={
                      'mt-1 inline-block rounded-full border px-2 py-0.5 text-xs ' +
                      RATING_BADGE[item.plant.cal_ipc_rating]
                    }
                  >
                    {RATING_LABEL[item.plant.cal_ipc_rating]}
                  </span>
                )}
                {item.warnings.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-700">
                    {item.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-sm font-medium text-stone-900">
                  Method: {item.method}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-600 hover:text-stone-900"
        >
          ← Back to confirm
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
        >
          Start over
        </button>
      </div>
    </section>
  )
}
