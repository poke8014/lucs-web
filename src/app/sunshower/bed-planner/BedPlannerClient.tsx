'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import BaseMapStep from './BaseMapStep'
import PathsStep from './PathsStep'
import SectionsStep from './SectionsStep'
import PlantStep from './PlantStep'
import CheckStep from './CheckStep'
import MobileReadView from './MobileReadView'
import { createPersistentBlobStore } from './persistentBlobStore'
import {
  buildPlanExport,
  downloadJson,
  importErrorMessage,
  planFilename,
  readImportedFile,
} from './planExportUi'
import { useGardenPlans } from './useGardenPlans'
import type { GardenPlan } from './types'

// The bed-planner workspace shell. Five steps, freely revisitable via a pill nav
// + `?view=<step>` deep links — a workspace, not a wizard (same pattern as the
// site-inventory walkthrough). All five are live: base map / paths / sections /
// plant / check.
//
// Plan state lives in unit A's `useGardenPlans` hook (IndexedDB, debounced
// saves, corrupt-fallback to memory). Each step takes `(plan, onChange)`, so the
// persistence seam stays behind this component — the steps never learn where the
// plan lives. A compact plan strip in the header carries the multi-draft, fork,
// export/import, and "not saving" surface the hook exposes. Below the `sm`
// breakpoint the editor is swapped for a read-only in-yard reference (unit I).

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

const FIRST_PLAN_NAME = 'My first plan'

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

  const {
    plans,
    activePlan,
    activeId,
    hydrated,
    storageStatus,
    setActiveId,
    createPlan,
    updatePlan,
    fork,
    addPlan,
    store,
  } = useGardenPlans()

  // A transient notice for the export/import affordances (image-omitted on
  // export; a friendly error or success on import). Auto-clears on the next
  // action; nothing here ever blocks.
  const [ioNotice, setIoNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)

  // Once hydration settles with no plans on disk, seed a friendly first one so
  // the canvas always has something framed. The guard makes it fire exactly once
  // (a second render sees plans.length > 0). Runs after mount, never on the
  // server — SSR and first client render both show the loading shell.
  const seededFirst = useRef(false)
  useEffect(() => {
    if (!hydrated || seededFirst.current) return
    seededFirst.current = true
    if (plans.length === 0) createPlan(FIRST_PLAN_NAME)
  }, [hydrated, plans.length, createPlan])

  // One IndexedDB-backed image store for the session, over the hook's live store
  // ref (`store` swaps from memory to IDB once the async open resolves; the
  // adapter reads through it, so building it up front is fine). A lazy useState
  // gives a stable value that's render-safe to read (unlike a ref). Passed to
  // BaseMapStep so uploaded base maps persist across reloads; disposed on unmount
  // to release its cached object-URLs.
  const [blobStore] = useState(() => createPersistentBlobStore(store))
  useEffect(() => () => blobStore.dispose(), [blobStore])

  function goToStep(id: StepId) {
    router.replace(`/sunshower/bed-planner?view=${id}`, { scroll: false })
  }

  // A stable onChange for the active plan — patches flow through the hook, which
  // restamps updatedAt and schedules a debounced save.
  function onPlanChange(next: GardenPlan) {
    updatePlan(next.id, next)
  }

  // Export the active plan as JSON (base-map image inlined when small; omitted
  // with a note otherwise). Reads the image through the live store.
  async function onExport() {
    if (!activePlan) return
    setIoNotice(null)
    const { json, imageOmitted } = await buildPlanExport(activePlan, store.current)
    downloadJson(json, planFilename(activePlan.name))
    if (imageOmitted) {
      setIoNotice({
        tone: 'warn',
        text: 'Exported the plan — the base-map image was too big to include, so it stayed behind. The geometry is all there.',
      })
    }
  }

  // Import a plan from a JSON file → validate → add as a new active plan. If the
  // file inlined a base-map image, restore it under the plan's imageKey.
  async function onImportFile(file: File) {
    setIoNotice(null)
    const result = await readImportedFile(file)
    if (!result.ok) {
      setIoNotice({ tone: 'warn', text: importErrorMessage(result.error) })
      return
    }
    const added = addPlan(result.plan)
    // Restore an inlined base-map image so the imported plan shows its map.
    const key = added.baseMap.imageKey
    if (result.imageDataUrl && key) {
      try {
        const blob = await (await fetch(result.imageDataUrl)).blob()
        await store.current.putBlob(key, blob)
      } catch {
        // A lost image is cosmetic — the plan still imported fine.
      }
    }
    setIoNotice({ tone: 'ok', text: `Imported “${added.name}” as a new plan.` })
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

        {!hydrated || !activePlan ? (
          <LoadingShell />
        ) : (
          <>
            <PlanStrip
              plans={plans}
              activePlan={activePlan}
              activeId={activeId}
              storageStatus={storageStatus}
              onSelect={setActiveId}
              onRename={(name) => updatePlan(activePlan.id, { name })}
              onNew={() => createPlan(defaultNewName(plans.length))}
              onFork={() => fork(activePlan.id)}
              onExport={onExport}
              onImportFile={onImportFile}
              ioNotice={ioNotice}
            />

            {/* Mobile: a read-only, in-yard reference. Editing is desktop/tablet
                work, so below `sm` we hide the canvas editor entirely. */}
            <div className="sm:hidden">
              <MobileReadView
                plans={plans}
                activePlan={activePlan}
                activeId={activeId}
                onSelect={setActiveId}
              />
            </div>

            {/* Desktop / tablet: the full step-by-step editor. */}
            <div className="hidden sm:block">
              <StepNav current={current} onNavigate={goToStep} />

              <div className="mt-2">
                {current === 'base-map' && (
                  <BaseMapStep
                    plan={activePlan}
                    onChange={onPlanChange}
                    blobStore={blobStore}
                  />
                )}
                {current === 'paths' && <PathsStep plan={activePlan} onChange={onPlanChange} />}
                {current === 'sections' && <SectionsStep plan={activePlan} onChange={onPlanChange} />}
                {current === 'plant' && <PlantStep plan={activePlan} onChange={onPlanChange} />}
                {current === 'check' && (
                  <CheckStep
                    plan={activePlan}
                    onChange={onPlanChange}
                    blobStore={blobStore}
                    onJumpToSection={() => goToStep('sections')}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function defaultNewName(existingCount: number): string {
  return `Plan ${existingCount + 1}`
}

// ── Plan strip: active-plan name, switcher, new, fork, save notice ────────────

/**
 * The compact multi-draft header. Inline-rename the active plan; switch between
 * drafts when there's more than one; start a fresh plan; and one-tap "try a
 * variant" to fork the active plan (cheap iteration is first-class — 5–20 drafts
 * per project is normal). When the store fell back to memory, a quiet notice
 * says edits live only in this tab.
 */
function PlanStrip({
  plans,
  activePlan,
  activeId,
  storageStatus,
  onSelect,
  onRename,
  onNew,
  onFork,
  onExport,
  onImportFile,
  ioNotice,
}: {
  plans: GardenPlan[]
  activePlan: GardenPlan
  activeId: string | null
  storageStatus: 'idb' | 'memory'
  onSelect: (id: string) => void
  onRename: (name: string) => void
  onNew: () => void
  onFork: () => void
  onExport: () => void
  onImportFile: (file: File) => void
  ioNotice: { tone: 'ok' | 'warn'; text: string } | null
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="mb-5 rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/70 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {plans.length > 1 && (
          <label className="sr-only" htmlFor="plan-switcher">
            Switch plan
          </label>
        )}
        {plans.length > 1 && (
          <select
            id="plan-switcher"
            value={activeId ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            className="max-w-[10rem] rounded-md border border-[#2a1d10]/25 bg-white/70 px-2 py-1.5 text-sm text-[#2a1d10] focus:border-[#2a1d10]/60 focus:outline-none"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <PlanNameField key={activePlan.id} name={activePlan.name} onRename={onRename} />

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onFork}
            title="Duplicate this plan to try a variation"
            className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df] px-2.5 py-1.5 text-sm text-[#2a1d10] hover:border-[#2a1d10]/60"
          >
            Try a variant
          </button>
          <button
            type="button"
            onClick={onNew}
            className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df] px-2.5 py-1.5 text-sm text-[#2a1d10] hover:border-[#2a1d10]/60"
          >
            New plan
          </button>
          <button
            type="button"
            onClick={onExport}
            title="Download this plan as a JSON file you can keep or share"
            className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df] px-2.5 py-1.5 text-sm text-[#2a1d10] hover:border-[#2a1d10]/60"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Load a plan from a JSON file as a new draft"
            className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df] px-2.5 py-1.5 text-sm text-[#2a1d10] hover:border-[#2a1d10]/60"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImportFile(file)
              e.target.value = '' // let the same file re-trigger later
            }}
          />
        </div>
      </div>

      {ioNotice && (
        <p className={'mt-2 text-xs ' + (ioNotice.tone === 'ok' ? 'text-emerald-800' : 'text-[#7a3b12]')}>
          {ioNotice.text}
        </p>
      )}

      {storageStatus === 'memory' && (
        <p className="mt-2 text-xs text-[#7a3b12]">
          Not saving — changes live only in this tab. (Your browser blocked
          storage, so a reload will start fresh. Export a plan to keep it.)
        </p>
      )}
    </div>
  )
}

/** Inline-editable plan name — commits on blur / Enter, reverts on Escape. */
function PlanNameField({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState(name)

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
    else setDraft(name) // empty or unchanged — snap back to the stored name
  }

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setDraft(name)
          e.currentTarget.blur()
        }
      }}
      aria-label="Plan name"
      className="min-w-0 max-w-[16rem] flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-base font-medium text-[#2a1d10] hover:border-[#2a1d10]/20 focus:border-[#2a1d10]/40 focus:bg-white/70 focus:outline-none"
    />
  )
}

// ── Loading + placeholder shells ──────────────────────────────────────────────

function LoadingShell() {
  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/60 p-8 text-center">
      <p className="text-sm text-[#2a1d10]/60">Opening your plans…</p>
    </div>
  )
}

// ── Step nav (unchanged) ──────────────────────────────────────────────────────

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
