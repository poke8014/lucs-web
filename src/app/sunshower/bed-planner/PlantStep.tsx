'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadProfile } from '../site-inventory/profile'
import type { SiteProfile } from '../site-inventory/types'
import { nativePlants, plantBySlug } from '../plant-selector/corpus'
import type { SelectorPlant } from '../plant-selector/types'
import CanvasStage from './CanvasStage'
import PalettePanel from './PalettePanel'
import PlacementLayer from './PlacementLayer'
import { costBand, DEFAULT_UNIT_PRICE_USD, effortBandFor } from './estimate'
import { polygonArea, pointInPolygon } from './geometry'
import { newId } from './plan'
import {
  DEFAULT_MATRIX_SPACING_IN,
  DRIFT_STEPS,
  LAYER_TARGET_BANDS,
  layerShares,
  MAX_MATRIX_SPACING_IN,
  MIN_MATRIX_SPACING_IN,
  sectionQuantities,
  suggestDriftCount,
  type LayerShare,
} from './placements'
import type { PlacementKind, PlacementSuggestion } from './layerRole'
import type { BedSectionLabels } from './palette'
import type { GardenPlan, LayerRole, Placement, Point, Section } from './types'

// ── Flow step 4: plant ────────────────────────────────────────────────────────
// The section polygons carved in step 3 become filled beds here. The load-bearing
// modeling decision (spec §Scope decision 2) is that plants meet the ground three
// ways, so the planner never asks anyone to position 300 groundcover plugs:
//   individual — one plant, one point (structural / framework)
//   drift      — one species, a small traced polygon, an odd count (seasonal)
//   matrixFill — a species *mix* over the whole section at a spacing (groundcover)
//
// The palette (unit C) suggests a kind per plant; the user picks a plant, lands
// in placement mode with that kind pre-selected, and can switch with one tap. A
// suggestion, never a gate. Existing placements are selectable → editable.
//
// The layer-share meter fills toward the 10/30/50/10 silhouette, and the
// quantities panel is the placement-based refinement of step 3's area estimate.

const CLOSE_TOLERANCE_FT = 2 // click within this of the first drift corner to close

const KIND_LABEL: Record<PlacementKind, string> = {
  individual: 'individual',
  drift: 'drift',
  matrixFill: 'matrix fill',
}

const LAYER_META: Record<LayerRole, { label: string; color: string }> = {
  structural: { label: 'structural', color: '#7a4828' },
  seasonal: { label: 'seasonal', color: '#a9762f' },
  groundcover: { label: 'ground cover', color: '#4a5d23' },
  filler: { label: 'filler', color: '#4c748e' },
}

// The active tool: idle, placing a freshly-picked plant, or nothing yet.
type PlacementDraft = {
  plant: SelectorPlant
  suggestion: PlacementSuggestion
  kind: PlacementKind
  layerRole: LayerRole
}

export interface PlantStepProps {
  plan: GardenPlan
  onChange: (next: GardenPlan) => void
}

export default function PlantStep({ plan, onChange }: PlantStepProps) {
  const baseMap = plan.baseMap
  const sections = plan.sections

  const [profile, setProfile] = useState<SiteProfile | null>(null)
  useEffect(() => {
    setProfile(loadProfile())
  }, [])

  const corpus = useMemo(() => nativePlants(), [])

  // Active section — the palette filters by it, placements land in it. Default to
  // the first section once one exists.
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    sections[0]?.id ?? null,
  )
  useEffect(() => {
    // If the active section vanished (deleted upstream) or none is set, fall back.
    if (!sections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(sections[0]?.id ?? null)
    }
  }, [sections, activeSectionId])

  const activeSection = sections.find((s) => s.id === activeSectionId) ?? null

  // Placement mode: the plant + kind being placed. Null = not placing.
  const [draft, setDraft] = useState<PlacementDraft | null>(null)
  // The in-progress drift trace (feet-space points).
  const [driftTrace, setDriftTrace] = useState<Point[]>([])
  // The currently-selected existing placement, for editing.
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null)

  const selectedPlacement =
    plan.placements.find((p) => p.id === selectedPlacementId) ?? null

  function patchPlacements(next: Placement[]) {
    onChange({ ...plan, placements: next, updatedAt: new Date().toISOString() })
  }

  function updatePlacement(id: string, next: Placement) {
    patchPlacements(plan.placements.map((p) => (p.id === id ? next : p)))
  }

  function deletePlacement(id: string) {
    patchPlacements(plan.placements.filter((p) => p.id !== id))
    if (selectedPlacementId === id) setSelectedPlacementId(null)
  }

  // ── Picking a plant from the palette → enter placement mode ────────────────
  function onPick(plant: SelectorPlant, suggestion: PlacementSuggestion) {
    setSelectedPlacementId(null)
    setDriftTrace([])
    setDraft({
      plant,
      suggestion,
      kind: suggestion.kind,
      layerRole: suggestion.layerRole,
    })
    // matrixFill assigns to the whole section immediately — no tracing needed.
    if (suggestion.kind === 'matrixFill' && activeSection) {
      commitMatrix(plant, suggestion, activeSection)
    }
  }

  function switchKind(kind: PlacementKind) {
    if (!draft) return
    setDriftTrace([])
    // Switching to matrix places it straight away against the active section.
    if (kind === 'matrixFill' && activeSection) {
      commitMatrix(draft.plant, draft.suggestion, activeSection, kind)
      return
    }
    setDraft({ ...draft, kind })
  }

  // ── Canvas taps: place / trace, depending on the active kind ───────────────
  function onCanvasTap(p: Point) {
    // No active tool: a background tap clears the current selection.
    if (!draft || !activeSection) {
      setSelectedPlacementId(null)
      return
    }
    if (draft.kind === 'individual') {
      // Only drop inside the active section (the placement's home).
      if (!pointInPolygon(p, activeSection.polygon)) return
      const placement: Placement = {
        kind: 'individual',
        id: newId(),
        sectionId: activeSection.id,
        plantSlug: draft.plant.slug,
        layerRole: draft.layerRole,
        center: p,
      }
      patchPlacements([...plan.placements, placement])
      setSelectedPlacementId(placement.id)
      // Stay in placement mode so the user can drop several of the same plant.
      return
    }
    if (draft.kind === 'drift') {
      // Trace a small polygon; tap near the first corner (or Finish) to close.
      if (driftTrace.length >= 3) {
        const first = driftTrace[0]
        if (Math.hypot(p.x - first.x, p.y - first.y) <= CLOSE_TOLERANCE_FT) {
          commitDrift()
          return
        }
      }
      setDriftTrace((d) => [...d, p])
    }
  }

  function commitDrift() {
    if (!draft || !activeSection || driftTrace.length < 3) {
      setDriftTrace([])
      return
    }
    const count = suggestDriftCount(draft.plant, driftTrace)
    const placement: Placement = {
      kind: 'drift',
      id: newId(),
      sectionId: activeSection.id,
      plantSlug: draft.plant.slug,
      layerRole: draft.layerRole,
      area: driftTrace,
      count,
    }
    patchPlacements([...plan.placements, placement])
    setSelectedPlacementId(placement.id)
    setDriftTrace([])
  }

  function commitMatrix(
    plant: SelectorPlant,
    suggestion: PlacementSuggestion,
    section: Section,
    kind: PlacementKind = 'matrixFill',
  ) {
    // matrixFill layer role must be groundcover or filler (contract) — coerce a
    // structural/seasonal suggestion down to groundcover when the user forces a
    // matrix. (They asked for a population; it's a ground-plane role now.)
    const layerRole: LayerRole =
      suggestion.layerRole === 'filler' ? 'filler' : 'groundcover'
    const placement: Placement = {
      kind: 'matrixFill',
      id: newId(),
      sectionId: section.id,
      layerRole,
      mix: [{ plantSlug: plant.slug, sharePct: 100 }],
      spacingIn: DEFAULT_MATRIX_SPACING_IN,
    }
    patchPlacements([...plan.placements, placement])
    setSelectedPlacementId(placement.id)
    setDraft({ plant, suggestion, kind, layerRole })
    setDriftTrace([])
  }

  // Keyboard: Enter closes a drift trace, Escape cancels the active tool/trace.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing) return
      if (e.key === 'Enter' && driftTrace.length >= 3) {
        e.preventDefault()
        commitDrift()
      } else if (e.key === 'Escape') {
        if (driftTrace.length > 0) setDriftTrace([])
        else setDraft(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driftTrace, draft, activeSection])

  // ── Derived: quantities + shares for the active section ────────────────────
  const quantities = useMemo(
    () => sectionQuantities(sections, plan.placements, corpus),
    [sections, plan.placements, corpus],
  )
  const activeCounts = activeSection ? quantities[activeSection.id] : null

  // No sections yet → gentle handoff to step 3.
  if (sections.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-[#2a1d10]/25 bg-[#fff6df]/60 p-8 text-center">
        <h2 className="font-serif text-2xl text-[#2a1d10]">Plant your beds</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#2a1d10]/70">
          First carve the yard into sections back in the Sections step — then come
          here to fill each one with natives. No rush; the beds will be waiting.
        </p>
      </section>
    )
  }

  const activeLabels: BedSectionLabels = activeSection
    ? {
        sunZoneId: activeSection.sunZoneId,
        moisture: activeSection.labels.moisture,
        soilTexture: activeSection.labels.soilTexture,
      }
    : {}

  return (
    <section className="space-y-5">
      <div className="space-y-2 text-sm text-[#2a1d10]/80 sm:text-base">
        <p>
          Pick a section, then pick plants for it. We&rsquo;ll suggest how each one
          likes to be planted — a lone specimen, a drift of a few, or a spreading
          mix — but you always have the final say.
        </p>
        <p className="text-[#2a1d10]/65">
          The little meter under each section watches the balance of layers, so the
          bed reads as intentional and the ground never sits bare.
        </p>
      </div>

      {/* Section switcher — the active section drives the palette + placement. */}
      <SectionSwitcher
        sections={sections}
        activeSectionId={activeSectionId}
        onSelect={(id) => {
          setActiveSectionId(id)
          setSelectedPlacementId(null)
          setDraft(null)
          setDriftTrace([])
        }}
        quantities={quantities}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Canvas + placement mode bar */}
        <div className="space-y-3">
          <div className="h-[26rem] overflow-hidden rounded-lg border border-[#2a1d10]/20 sm:h-[30rem]">
            <CanvasStage
              widthFt={baseMap.widthFt}
              heightFt={baseMap.heightFt}
              northBearingDeg={baseMap.northBearingDeg ?? 0}
              className="h-full w-full"
              onBackgroundPointerDown={onCanvasTap}
            >
              <PlacementLayer
                sections={sections}
                placements={plan.placements}
                activeSectionId={activeSectionId}
                selectedPlacementId={selectedPlacementId}
                plantBySlug={plantBySlug}
                draftDrift={draft?.kind === 'drift' ? driftTrace : null}
                onSelectSection={(id) => {
                  setActiveSectionId(id)
                  setSelectedPlacementId(null)
                }}
                onSelectPlacement={(id) => {
                  setSelectedPlacementId(id)
                  setDraft(null)
                  setDriftTrace([])
                }}
                onMovePlacement={(id, center) => {
                  const pl = plan.placements.find((p) => p.id === id)
                  if (pl && pl.kind === 'individual') {
                    updatePlacement(id, { ...pl, center })
                  }
                }}
              />
            </CanvasStage>
          </div>

          {draft ? (
            <PlacementModeBar
              draft={draft}
              driftCount={driftTrace.length}
              onSwitchKind={switchKind}
              onFinishDrift={commitDrift}
              onCancel={() => {
                setDraft(null)
                setDriftTrace([])
              }}
            />
          ) : (
            <p className="text-xs text-[#2a1d10]/55">
              Pick a plant from the palette to start placing. Tap a placement on the
              canvas to edit or move it.
            </p>
          )}

          {/* Editor for a selected existing placement. */}
          {selectedPlacement && (
            <PlacementEditor
              placement={selectedPlacement}
              section={sections.find((s) => s.id === selectedPlacement.sectionId) ?? null}
              corpus={corpus}
              onUpdate={(next) => updatePlacement(selectedPlacement.id, next)}
              onDelete={() => deletePlacement(selectedPlacement.id)}
            />
          )}
        </div>

        {/* Palette panel — filtered by the active section's labels. */}
        <div className="h-[30rem] lg:h-auto">
          {activeSection ? (
            <PalettePanel labels={activeLabels} profile={profile} onPick={onPick} />
          ) : (
            <div className="rounded-lg border border-dashed border-[#2a1d10]/25 bg-[#fff6df]/60 p-6 text-center text-sm text-[#2a1d10]/60">
              Pick a section to see plants that fit it.
            </div>
          )}
        </div>
      </div>

      {/* Layer-share meter + quantities for the active section. */}
      {activeSection && activeCounts && (
        <div className="grid gap-4 md:grid-cols-2">
          <LayerShareMeter shares={layerShares(activeCounts.byLayer)} />
          <QuantitiesPanel counts={activeCounts} />
        </div>
      )}
    </section>
  )
}

// ── Section switcher — pick the active section (list mirrors the canvas) ──────

function SectionSwitcher({
  sections,
  activeSectionId,
  onSelect,
  quantities,
}: {
  sections: Section[]
  activeSectionId: string | null
  onSelect: (id: string) => void
  quantities: Record<string, { total: number }>
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        Working in
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sections.map((s) => {
          const active = s.id === activeSectionId
          const total = quantities[s.id]?.total ?? 0
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={active}
              className={
                'rounded-full border px-3.5 py-1.5 text-sm transition ' +
                (active
                  ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                  : 'border-[#2a1d10]/30 bg-[#fff6df]/70 text-[#2a1d10]/80 hover:border-[#2a1d10]/60')
              }
            >
              {s.name}
              {total > 0 && (
                <span className={'ml-1.5 text-xs ' + (active ? 'text-[#f7e9c9]/70' : 'text-[#2a1d10]/50')}>
                  {total}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Placement mode bar — the picked plant, suggested kind, one-tap switcher ───

function PlacementModeBar({
  draft,
  driftCount,
  onSwitchKind,
  onFinishDrift,
  onCancel,
}: {
  draft: PlacementDraft
  driftCount: number
  onSwitchKind: (kind: PlacementKind) => void
  onFinishDrift: () => void
  onCancel: () => void
}) {
  const name = draft.plant.common_names[0] ?? draft.plant.scientific_name
  const kinds: PlacementKind[] = ['individual', 'drift', 'matrixFill']
  const isSuggested = draft.kind === draft.suggestion.kind

  return (
    <div className="rounded-lg border border-[#a9762f]/40 bg-[#fff6df] px-3.5 py-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-medium text-[#2a1d10]">Placing {name}</span>
          <span className="ml-2 text-xs text-[#2a1d10]/55">as a {KIND_LABEL[draft.kind]}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#7a3b12] underline-offset-2 hover:underline"
        >
          done
        </button>
      </div>

      {/* Kind switcher — the suggestion is pre-selected, badged with its reason. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {kinds.map((k) => {
          const active = draft.kind === k
          const suggested = k === draft.suggestion.kind
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSwitchKind(k)}
              aria-pressed={active}
              title={suggested ? draft.suggestion.reason : undefined}
              className={
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ' +
                (active
                  ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                  : 'border-[#2a1d10]/30 bg-[#fff6df]/80 text-[#2a1d10]/75 hover:border-[#2a1d10]/60')
              }
            >
              {KIND_LABEL[k]}
              {suggested && (
                <span className={'text-[9px] uppercase ' + (active ? 'text-[#f7e9c9]/70' : 'text-emerald-800/70')}>
                  suggested
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* The suggestion's reason — a gentle "why", never a gate. */}
      <p className="text-xs text-[#2a1d10]/60">
        {isSuggested
          ? draft.suggestion.reason
          : 'Your call — place it however works for your bed.'}
      </p>

      {/* Kind-specific hint / action. */}
      {draft.kind === 'individual' && (
        <p className="text-xs text-[#2a1d10]/55">
          Tap inside the section to drop it. Its mature footprint shows at full
          width — keep tapping to place a few.
        </p>
      )}
      {draft.kind === 'drift' && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-[#2a1d10]/55">
            Trace a small patch inside the section — we&rsquo;ll suggest an odd count.
          </span>
          {driftCount > 0 && (
            <>
              <span className="text-[#2a1d10]/60">
                {driftCount} corner{driftCount === 1 ? '' : 's'}
              </span>
              {driftCount >= 3 && (
                <button
                  type="button"
                  onClick={onFinishDrift}
                  className="rounded-md bg-[#2a1d10] px-3 py-1 text-[#f7e9c9] hover:bg-[#3d2a18]"
                >
                  Finish drift
                </button>
              )}
            </>
          )}
        </div>
      )}
      {draft.kind === 'matrixFill' && (
        <p className="text-xs text-[#2a1d10]/55">
          Assigned to the whole section as a spreading mix. Adjust the spacing and
          add species in the editor below.
        </p>
      )}
    </div>
  )
}

// ── Placement editor — edit a selected placement ──────────────────────────────

function PlacementEditor({
  placement,
  section,
  corpus,
  onUpdate,
  onDelete,
}: {
  placement: Placement
  section: Section | null
  corpus: SelectorPlant[]
  onUpdate: (next: Placement) => void
  onDelete: () => void
}) {
  const title =
    placement.kind === 'matrixFill'
      ? 'Matrix fill'
      : plantName(plantBySlug(placement.plantSlug))

  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-serif text-lg text-[#2a1d10]">{title}</span>
          <span className="ml-2 text-xs text-[#2a1d10]/55">· {KIND_LABEL[placement.kind]}</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-xs text-[#7a3b12] underline-offset-2 hover:underline"
        >
          remove
        </button>
      </div>

      {/* Layer role — always editable (the suggestion is only a starting point). */}
      <LayerRolePicker
        value={placement.layerRole}
        // matrixFill's role is constrained to the ground plane by the contract.
        allowed={placement.kind === 'matrixFill' ? ['groundcover', 'filler'] : undefined}
        onChange={(layerRole) => onUpdate({ ...placement, layerRole })}
      />

      {placement.kind === 'drift' && (
        <DriftCountStepper
          count={placement.count}
          onChange={(count) => onUpdate({ ...placement, count })}
        />
      )}

      {placement.kind === 'matrixFill' && (
        <MatrixMixEditor
          placement={placement}
          corpus={corpus}
          sectionAreaFt2={section ? polygonArea(section.polygon) : 0}
          onUpdate={onUpdate}
        />
      )}
    </div>
  )
}

function LayerRolePicker({
  value,
  allowed,
  onChange,
}: {
  value: LayerRole
  allowed?: LayerRole[]
  onChange: (role: LayerRole) => void
}) {
  const roles = (allowed ?? (['structural', 'seasonal', 'groundcover', 'filler'] as LayerRole[]))
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">Layer</p>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((role) => {
          const active = value === role
          return (
            <button
              key={role}
              type="button"
              onClick={() => onChange(role)}
              aria-pressed={active}
              className={
                'rounded-full border px-2.5 py-1 text-xs transition ' +
                (active
                  ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                  : 'border-[#2a1d10]/30 bg-[#fff6df]/70 text-[#2a1d10]/75 hover:border-[#2a1d10]/60')
              }
            >
              {LAYER_META[role].label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DriftCountStepper({
  count,
  onChange,
}: {
  count: number
  onChange: (count: number) => void
}) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">
        How many — odd numbers read as intentional
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {DRIFT_STEPS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={count === n}
            className={
              'h-8 w-8 rounded-full border text-sm transition ' +
              (count === n
                ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                : 'border-[#2a1d10]/30 bg-[#fff6df]/70 text-[#2a1d10]/75 hover:border-[#2a1d10]/60')
            }
          >
            {n}
          </button>
        ))}
        {!DRIFT_STEPS.includes(count as (typeof DRIFT_STEPS)[number]) && (
          <span className="ml-1 text-xs text-[#2a1d10]/55">or {count} (traced)</span>
        )}
      </div>
    </div>
  )
}

// ── Matrix mix editor — species + shares, normalize-to-100, spacing ──────────

function MatrixMixEditor({
  placement,
  corpus,
  sectionAreaFt2,
  onUpdate,
}: {
  placement: Extract<Placement, { kind: 'matrixFill' }>
  corpus: SelectorPlant[]
  sectionAreaFt2: number
  onUpdate: (next: Placement) => void
}) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')

  const shareTotal = placement.mix.reduce((s, m) => s + (m.sharePct || 0), 0)

  function setSpacing(spacingIn: number) {
    onUpdate({ ...placement, spacingIn })
  }

  function setShare(index: number, pct: number) {
    onUpdate({
      ...placement,
      mix: placement.mix.map((m, i) => (i === index ? { ...m, sharePct: pct } : m)),
    })
  }

  function normalize() {
    // Split 100 evenly, keeping relative weights where they sum > 0.
    const total = placement.mix.reduce((s, m) => s + (m.sharePct || 0), 0)
    const next =
      total > 0
        ? placement.mix.map((m) => ({ ...m, sharePct: Math.round((m.sharePct / total) * 100) }))
        : placement.mix.map((m) => ({ ...m, sharePct: Math.round(100 / placement.mix.length) }))
    onUpdate({ ...placement, mix: next })
  }

  function removeSpecies(index: number) {
    if (placement.mix.length <= 1) return // keep at least one species
    onUpdate({ ...placement, mix: placement.mix.filter((_, i) => i !== index) })
  }

  function addSpecies(plant: SelectorPlant) {
    if (placement.mix.some((m) => m.plantSlug === plant.slug)) {
      setAdding(false)
      setQuery('')
      return
    }
    // New species enters at an even share; the user can retune + normalize.
    const evenShare = Math.round(100 / (placement.mix.length + 1))
    onUpdate({
      ...placement,
      mix: [...placement.mix, { plantSlug: plant.slug, sharePct: evenShare }],
    })
    setAdding(false)
    setQuery('')
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as SelectorPlant[]
    return corpus
      .filter(
        (p) =>
          p.common_names.some((n) => n.toLowerCase().includes(q)) ||
          p.scientific_name.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [query, corpus])

  return (
    <div className="space-y-3">
      {/* Spacing */}
      <div>
        <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">
          Spacing (on-center)
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={MIN_MATRIX_SPACING_IN}
            max={MAX_MATRIX_SPACING_IN}
            step={1}
            value={placement.spacingIn}
            onChange={(e) => setSpacing(Number(e.target.value))}
            aria-label="Matrix spacing in inches"
            className="flex-1 accent-[#4a5d23]"
          />
          <span className="w-12 text-sm text-[#2a1d10]">{placement.spacingIn}&Prime;</span>
        </div>
        <p className="mt-0.5 text-xs text-[#2a1d10]/50">
          Tighter spacing knits together faster and shades out weeds sooner.
        </p>
      </div>

      {/* Species mix */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">The mix</p>
          {Math.abs(shareTotal - 100) > 0.5 && placement.mix.length > 0 && (
            <button
              type="button"
              onClick={normalize}
              className="text-xs text-emerald-800 underline-offset-2 hover:underline"
            >
              balance to 100% (now {Math.round(shareTotal)}%)
            </button>
          )}
        </div>
        <ul className="space-y-1.5">
          {placement.mix.map((m, i) => {
            const plant = plantBySlug(m.plantSlug)
            return (
              <li key={m.plantSlug} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-[#2a1d10]">
                  {plantName(plant)}
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(m.sharePct)}
                  onChange={(e) => setShare(i, Number(e.target.value))}
                  aria-label={`Share for ${plantName(plant)}`}
                  className="w-16 rounded-md border border-[#2a1d10]/25 bg-white/70 px-2 py-1 text-sm text-[#2a1d10] focus:border-[#2a1d10]/60 focus:outline-none"
                />
                <span className="text-xs text-[#2a1d10]/50">%</span>
                {placement.mix.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSpecies(i)}
                    aria-label={`Remove ${plantName(plant)}`}
                    className="text-[#7a3b12] hover:text-[#a9401a]"
                  >
                    ×
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {/* Add-species inline search */}
        {adding ? (
          <div className="mt-2">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add a species by name…"
              className="w-full rounded-md border border-[#2a1d10]/25 bg-white/80 px-3 py-1.5 text-sm text-[#2a1d10] placeholder:text-[#2a1d10]/40 focus:border-emerald-800 focus:outline-none"
            />
            {matches.length > 0 && (
              <ul className="mt-1 rounded-md border border-[#2a1d10]/15 bg-[#fff6df]">
                {matches.map((p) => (
                  <li key={p.slug}>
                    <button
                      type="button"
                      onClick={() => addSpecies(p)}
                      className="block w-full px-3 py-1.5 text-left text-sm text-[#2a1d10] hover:bg-[#f7e9c9]"
                    >
                      {plantName(p)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setQuery('')
              }}
              className="mt-1 text-xs text-[#2a1d10]/55 underline-offset-2 hover:underline"
            >
              cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-2 rounded-md border border-[#2a1d10]/25 bg-[#fff6df] px-2.5 py-1 text-xs text-[#2a1d10] hover:border-[#2a1d10]/60"
          >
            + add a species
          </button>
        )}
      </div>

      <p className="text-xs text-[#2a1d10]/50">
        ≈ {sectionAreaFt2 > 0 ? Math.round(sectionAreaFt2) : 0} sq ft of ground to
        cover — quantities update below as you tune the mix.
      </p>
    </div>
  )
}

// ── Layer-share meter — the 10/30/50/10 silhouette ────────────────────────────

function LayerShareMeter({ shares }: { shares: LayerShare[] }) {
  const total = shares.reduce((s, x) => s + x.count, 0)

  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/80 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        The layer balance
      </p>
      <p className="mt-0.5 text-xs text-[#2a1d10]/55">
        A healthy bed aims for a bit of structure, a seasonal show, and a deep
        ground-covering base.
      </p>

      {/* Stacked bar filling toward the target silhouette. */}
      <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-[#2a1d10]/8">
        {total > 0 ? (
          shares.map((s) => (
            <div
              key={s.role}
              style={{ width: `${s.share * 100}%`, background: LAYER_META[s.role].color }}
              title={`${LAYER_META[s.role].label}: ${Math.round(s.share * 100)}%`}
            />
          ))
        ) : (
          <div className="flex w-full items-center justify-center text-[10px] text-[#2a1d10]/40">
            nothing placed yet
          </div>
        )}
      </div>

      {/* Per-layer counts + friendly under/over hints. */}
      <ul className="mt-3 space-y-1 text-xs">
        {shares.map((s) => (
          <li key={s.role} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: LAYER_META[s.role].color }}
              aria-hidden
            />
            <span className="w-24 text-[#2a1d10]/80">{LAYER_META[s.role].label}</span>
            <span className="text-[#2a1d10]/55">
              {s.count} · {Math.round(s.share * 100)}%
            </span>
            {total > 0 && s.verdict !== 'ok' && (
              <span className={s.verdict === 'thin' ? 'text-amber-800/80' : 'text-[#7a3b12]/80'}>
                {hintFor(s)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A friendly under/over hint per layer — invitations, never scolds. */
function hintFor(share: LayerShare): string {
  const pct = Math.round(LAYER_TARGET_BANDS[share.role].min * 100)
  if (share.role === 'groundcover' && share.verdict === 'thin') {
    return '— ground cover looks thin; bare soil re-invites weeds'
  }
  if (share.verdict === 'thin') {
    return `— a little light (aim ~${pct}%+)`
  }
  // heavy
  if (share.role === 'structural') return '— lots of big plants; a few carry a bed'
  return '— running a bit heavy here'
}

// ── Quantities panel — species × count × price, the placement-based estimate ──

function QuantitiesPanel({
  counts,
}: {
  counts: { total: number; bySpecies: Record<string, number> }
}) {
  const [priceText, setPriceText] = useState(String(DEFAULT_UNIT_PRICE_USD))
  const unitPrice = Number(priceText) > 0 ? Number(priceText) : DEFAULT_UNIT_PRICE_USD

  const rows = Object.entries(counts.bySpecies)
    .map(([slug, count]) => ({ plant: plantBySlug(slug), slug, count }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)

  const { low, high } = costBand(counts.total, unitPrice)

  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-emerald-800/5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
          What this section needs
        </p>
        <span className="text-xs text-[#2a1d10]/55">
          {counts.total > 0 ? `~${counts.total} plants — ${effortBandFor(counts.total)}` : 'nothing yet'}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[#2a1d10]/60">
          Place a plant and its count shows up here — the real refinement of the
          rough estimate from the Sections step.
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-1 text-sm">
            {rows.map((r) => (
              <li key={r.slug} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[#2a1d10]">{plantName(r.plant)}</span>
                <span className="text-[#2a1d10]/70">×{r.count}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#2a1d10]/10 pt-3 text-sm text-[#2a1d10]/80">
            <span>
              Rough cost{' '}
              <strong className="text-[#2a1d10]">
                ${low.toLocaleString()}–${high.toLocaleString()}
              </strong>{' '}
              at
            </span>
            <span className="inline-flex items-center gap-1">
              $
              <input
                type="number"
                min={0}
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                aria-label="Unit price per plant"
                className="w-16 rounded-md border border-[#2a1d10]/25 bg-white/70 px-2 py-1 text-sm text-[#2a1d10] focus:border-[#2a1d10]/60 focus:outline-none"
              />
              <span className="text-[#2a1d10]/55">/ plant</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-[#2a1d10]/50">
            A rough feel, not a shopping list — a 1-gal native runs about $12.
          </p>
        </>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function plantName(plant: SelectorPlant | undefined): string {
  if (!plant) return 'Unknown plant'
  return plant.common_names[0] ?? plant.scientific_name
}
