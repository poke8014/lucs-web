'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadProfile } from '../site-inventory/profile'
import type { SiteProfile, SunTier } from '../site-inventory/types'
import CanvasStage, { useStage } from './CanvasStage'
import { estimateSection, DEFAULT_UNIT_PRICE_USD, type DensityStyle } from './estimate'
import { polygonArea, polygonCentroid } from './geometry'
import { newId } from './plan'
import type { GardenPlan, PhaseState, Point, Section } from './types'

// ── Flow step 3: sections ────────────────────────────────────────────────────
// The paths carved the yard into rooms; here each room becomes a named bed with
// its own conditions and build season. Sections are the *execution units* of the
// section-by-section rollout (Luc 2026-07-03): each moves cleanup → prep → plant
// on its own timeline while the rest waits under cardboard. So the sidebar list
// isn't decoration — it *is* the rollout plan ("fall 2026: back fence bed · under
// cardboard until then").
//
// Drawing mirrors the base-map trace: click empty canvas to drop corners
// (CanvasStage's `onBackgroundPointerDown` seam), click back near the first
// corner (or Enter / the Finish button) to close, Escape to cancel. Unlike a
// path, a section is a *closed* polygon.
//
// The SiteProfile is read-only input — we read `loadProfile()` to offer its sun
// zones, soil, and pooling hints, and never write back (spec §Scope decisions:
// one-way flow). Linking a zone inherits its tier as the section's `sun` label.

const CLOSE_TOLERANCE_FT = 3 // click within this of the first corner to close

// The 5-tier sun vocabulary, with short human labels. Shared with the walkthrough
// (vault/concepts/sun-requirements) — one vocabulary; we only render it here.
const SUN_TIERS: { value: SunTier; label: string }[] = [
  { value: 'full_sun', label: 'full sun' },
  { value: 'morning_sun_afternoon_shade', label: 'morning sun, afternoon shade' },
  { value: 'morning_shade_afternoon_sun', label: 'morning shade, afternoon sun' },
  { value: 'dappled_shade', label: 'dappled shade' },
  { value: 'full_shade', label: 'full shade' },
]

const MOISTURE: { value: NonNullable<Section['labels']['moisture']>; label: string }[] = [
  { value: 'dry', label: 'dry' },
  { value: 'average', label: 'average' },
  { value: 'wet', label: 'wet' },
]

const SOIL: { value: NonNullable<Section['labels']['soilTexture']>; label: string }[] = [
  { value: 'sandy', label: 'sandy' },
  { value: 'loamy', label: 'loamy' },
  { value: 'clay', label: 'clay' },
  { value: 'unsure', label: 'not sure' },
]

const DENSITY: { value: DensityStyle; label: string; blurb: string }[] = [
  {
    value: 'landscaped',
    label: 'Landscaped',
    blurb: 'Every plant its own breathing room — sparser, tidier, easy to read.',
  },
  {
    value: 'naturalistic',
    label: 'Naturalistic',
    blurb: 'A dense plant community that knits together and crowds out weeds.',
  },
]

const PHASE_STATES: { value: PhaseState; label: string }[] = [
  { value: 'untouched', label: 'untouched' },
  { value: 'cleanup', label: 'in cleanup' },
  { value: 'prepped', label: 'prepped' },
  { value: 'planted', label: 'planted' },
  { value: 'established', label: 'established' },
]

const HOLD_METHODS: { value: NonNullable<Section['holdMethod']>; label: string }[] = [
  { value: 'cardboard', label: 'cardboard' },
  { value: 'mulch', label: 'deep mulch' },
  { value: 'none', label: 'nothing yet' },
]

export interface SectionsStepProps {
  plan: GardenPlan
  onChange: (next: GardenPlan) => void
}

export default function SectionsStep({ plan, onChange }: SectionsStepProps) {
  const baseMap = plan.baseMap
  const sections = plan.sections

  // The read-only SiteProfile — loaded once for its sun zones + soil/pooling
  // hints. Never written back (spec: one-way flow).
  const [profile, setProfile] = useState<SiteProfile | null>(null)
  useEffect(() => {
    setProfile(loadProfile())
  }, [])

  // The in-progress polygon lives in the step (like the base-map draft) so the
  // CanvasStage click handler and the layer that draws it share one source.
  const [draft, setDraft] = useState<Point[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function patchSections(next: Section[]) {
    onChange({ ...plan, sections: next, updatedAt: new Date().toISOString() })
  }

  function commitDraft() {
    // A polygon needs at least a triangle to enclose area.
    if (draft.length >= 3) {
      const section = newSection(draft, sections.length)
      patchSections([...sections, section])
      setSelectedId(section.id)
    }
    setDraft([])
  }

  function onCanvasTap(p: Point) {
    // A tap back near the first corner closes the shape (matches the base map);
    // otherwise it drops another corner. Selection happens by tapping a drawn
    // section in the layer, so a background tap also clears the selection.
    if (draft.length >= 3) {
      const first = draft[0]
      if (Math.hypot(p.x - first.x, p.y - first.y) <= CLOSE_TOLERANCE_FT) {
        commitDraft()
        return
      }
    }
    setSelectedId(null)
    setDraft((d) => [...d, p])
  }

  // Keyboard: Enter closes the current section, Escape cancels it. Only active
  // while a draft is in flight so it never steals keys from the form fields.
  useEffect(() => {
    if (draft.length === 0) return
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing) return
      if (e.key === 'Enter') {
        e.preventDefault()
        commitDraft()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setDraft([])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  function updateSection(id: string, patch: Partial<Section>) {
    patchSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function moveSectionVertex(id: string, i: number, p: Point) {
    patchSections(
      sections.map((s) =>
        s.id === id
          ? { ...s, polygon: s.polygon.map((v, idx) => (idx === i ? p : v)) }
          : s,
      ),
    )
  }

  function deleteSection(id: string) {
    patchSections(sections.filter((s) => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const selected = sections.find((s) => s.id === selectedId) ?? null

  return (
    <section className="space-y-5">
      <div className="space-y-2 text-sm text-[#2a1d10]/80 sm:text-base">
        <p>
          The paths split the yard into rooms — now give each one a bed. Draw a
          shape around a room, name it, and tell it a little about itself. You&rsquo;ll
          plant them one at a time, on their own seasons.
        </p>
        <p className="text-[#2a1d10]/65">
          A section can wait its turn under cardboard while you finish another —
          only clear as much ground as you have plants for. Nothing here is
          final; a bed can always move, split, or merge later.
        </p>
      </div>

      <div className="mt-2 h-[26rem] overflow-hidden rounded-lg border border-[#2a1d10]/20 sm:h-[32rem]">
        <CanvasStage
          widthFt={baseMap.widthFt}
          heightFt={baseMap.heightFt}
          northBearingDeg={baseMap.northBearingDeg ?? 0}
          className="h-full w-full"
          onBackgroundPointerDown={onCanvasTap}
        >
          <SectionLayer
            sections={sections}
            draft={draft}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              setDraft([])
            }}
            onMoveVertex={moveSectionVertex}
          />
        </CanvasStage>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#2a1d10]/55">
          Click to drop corners around a bed. Click back on the first corner (or
          press Enter) to close it, Escape to start over. Click a bed to edit it.
        </p>
        {draft.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#2a1d10]/60">
              {draft.length} corner{draft.length === 1 ? '' : 's'}
            </span>
            {draft.length >= 3 && (
              <button
                type="button"
                onClick={commitDraft}
                className="rounded-md bg-[#2a1d10] px-3 py-1 text-[#f7e9c9] hover:bg-[#3d2a18]"
              >
                Finish section
              </button>
            )}
            <button
              type="button"
              onClick={() => setDraft([])}
              className="text-[#7a3b12] underline-offset-2 hover:underline"
            >
              cancel
            </button>
          </div>
        )}
      </div>

      {selected && (
        <SectionDetail
          section={selected}
          profile={profile}
          onUpdate={(patch) => updateSection(selected.id, patch)}
          onDelete={() => deleteSection(selected.id)}
        />
      )}

      {sections.length > 0 && (
        <RolloutList
          sections={sections}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setDraft([])
          }}
        />
      )}
    </section>
  )
}

/**
 * A fresh section over a traced polygon. Defaults are the gentlest ones: a
 * generated "Section N" name, untouched phase, everything else unset so the
 * detail panel's confirms are genuine confirms, not corrections.
 */
function newSection(polygon: Point[], existingCount: number): Section {
  return {
    id: newId(),
    name: `Section ${existingCount + 1}`,
    polygon,
    labels: {},
    phaseState: 'untouched',
  }
}

// ── Canvas layer: section polygons in feet-space ──────────────────────────────

/**
 * Draws committed section polygons (soft green fill, name label at the centroid)
 * plus the in-progress draft. The selected section shows draggable vertex
 * handles. Tapping a section selects it (the wide fill is the hit target); the
 * step owns selection + the draft, mirroring BaseMapStep's split.
 */
function SectionLayer({
  sections,
  draft,
  selectedId,
  onSelect,
  onMoveVertex,
}: {
  sections: Section[]
  draft: Point[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMoveVertex: (id: string, i: number, p: Point) => void
}) {
  const stage = useStage()

  return (
    <g>
      {sections.map((section, i) => {
        const screen = section.polygon.map((p) => stage.toScreen(p))
        const d = screen.map((s) => `${s.sx},${s.sy}`).join(' ')
        const selected = section.id === selectedId
        const label = stage.toScreen(polygonCentroid(section.polygon))
        return (
          <g key={section.id}>
            <polygon
              points={d}
              fill={selected ? 'rgba(74,93,35,0.22)' : 'rgba(74,93,35,0.12)'}
              stroke={selected ? '#4a5d23' : '#6b7d3a'}
              strokeWidth={selected ? 2.5 : 2}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation()
                onSelect(section.id)
              }}
            />
            {/* Name badge at the centroid, so the rollout reads on the canvas too. */}
            <text
              x={label.sx}
              y={label.sy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fill="#2a1d10"
              stroke="#f7e9c9"
              strokeWidth={3}
              paintOrder="stroke"
              pointerEvents="none"
              style={{ fontWeight: 600 }}
            >
              {section.name || `Section ${i + 1}`}
            </text>
            {selected &&
              screen.map((s, vi) => (
                <SectionVertexHandle
                  key={vi}
                  sx={s.sx}
                  sy={s.sy}
                  onDrag={(e) => onMoveVertex(section.id, vi, stage.eventToFeet(e))}
                />
              ))}
          </g>
        )
      })}

      {/* In-progress draft — dashed, with dots on each dropped corner. */}
      {draft.length > 0 && (
        <g pointerEvents="none">
          <polygon
            points={draft
              .map((p) => {
                const s = stage.toScreen(p)
                return `${s.sx},${s.sy}`
              })
              .join(' ')}
            fill="rgba(74,93,35,0.10)"
            stroke="#2a1d10"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          {draft.map((p, i) => {
            const s = stage.toScreen(p)
            return <circle key={i} cx={s.sx} cy={s.sy} r={4} fill={i === 0 ? '#4a5d23' : '#2a1d10'} />
          })}
        </g>
      )}
    </g>
  )
}

function SectionVertexHandle({
  sx,
  sy,
  onDrag,
}: {
  sx: number
  sy: number
  onDrag: (e: React.PointerEvent) => void
}) {
  const [dragging, setDragging] = useState(false)
  return (
    <circle
      cx={sx}
      cy={sy}
      r={6}
      fill="#fff6df"
      stroke="#4a5d23"
      strokeWidth={2}
      style={{ cursor: 'grab' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        setDragging(true)
        ;(e.target as Element).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (dragging) {
          e.stopPropagation()
          onDrag(e)
        }
      }}
      onPointerUp={(e) => {
        setDragging(false)
        ;(e.target as Element).releasePointerCapture(e.pointerId)
      }}
    />
  )
}

// ── Per-section detail: name, conditions, density, rollout, live estimate ─────

/**
 * The section editor. Everything a section carries beyond its polygon, grouped:
 * a name; conditions (sun zone link or tier, moisture, soil — seeded from the
 * SiteProfile where sensible, confirmed by the user); density style; and the
 * rollout fields (phase state, planned season, hold method). The live estimate
 * renders the moment a polygon and a density style land — the manageability
 * payoff (spec §Spacing & quantity math).
 */
function SectionDetail({
  section,
  profile,
  onUpdate,
  onDelete,
}: {
  section: Section
  profile: SiteProfile | null
  onUpdate: (patch: Partial<Section>) => void
  onDelete: () => void
}) {
  const zones = profile?.sunZones ?? []
  const areaFt2 = useMemo(() => polygonArea(section.polygon), [section.polygon])

  // Editable "rough" unit price, per section, seeded at the container-class
  // default. Kept as a string so the field can be cleared while typing.
  const [priceText, setPriceText] = useState(String(DEFAULT_UNIT_PRICE_USD))
  const unitPrice = Number(priceText) > 0 ? Number(priceText) : DEFAULT_UNIT_PRICE_USD

  function linkZone(zoneId: string) {
    // Linking a zone inherits its tier as the confirmed `sun` label and marks
    // the source 'stated' (a walkthrough label). Unlinking clears the bridge but
    // keeps whatever tier the user had — they can still tune it by hand.
    const zone = zones.find((z) => z.id === zoneId)
    if (!zone) {
      onUpdate({ sunZoneId: undefined })
      return
    }
    onUpdate({
      sunZoneId: zone.id,
      labels: { ...section.labels, sun: zone.tier, sunSource: 'stated' },
    })
  }

  function setTier(tier: SunTier) {
    // A direct tier pick is also a 'stated' label; it detaches any linked zone
    // so the two never disagree silently.
    onUpdate({
      sunZoneId: undefined,
      labels: { ...section.labels, sun: tier, sunSource: 'stated' },
    })
  }

  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-4 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={section.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          aria-label="Section name"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-serif text-xl text-[#2a1d10] hover:border-[#2a1d10]/20 focus:border-[#2a1d10]/40 focus:bg-white/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-xs text-[#7a3b12] underline-offset-2 hover:underline"
        >
          delete section
        </button>
      </div>

      {/* ── Conditions ── */}
      <FieldGroup label="Sun">
        {zones.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 text-xs text-[#2a1d10]/55">
              Link a zone from your site walkthrough — it&rsquo;ll bring its sun label along.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {zones.map((z) => (
                <Pill
                  key={z.id}
                  small
                  active={section.sunZoneId === z.id}
                  onClick={() => linkZone(section.sunZoneId === z.id ? '' : z.id)}
                >
                  {z.label}
                </Pill>
              ))}
            </div>
          </div>
        )}
        <p className="mb-1 text-xs text-[#2a1d10]/55">
          {zones.length > 0 ? 'Or set it directly:' : 'How much sun does this bed get?'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUN_TIERS.map((t) => (
            <Pill key={t.value} small active={section.labels.sun === t.value} onClick={() => setTier(t.value)}>
              {t.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Moisture" hint={seededHint(profile, 'moisture')}>
        <div className="flex flex-wrap gap-1.5">
          {MOISTURE.map((m) => (
            <Pill
              key={m.value}
              small
              active={section.labels.moisture === m.value}
              onClick={() =>
                onUpdate({
                  labels: {
                    ...section.labels,
                    moisture: section.labels.moisture === m.value ? undefined : m.value,
                  },
                })
              }
            >
              {m.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Soil" hint={seededHint(profile, 'soil')}>
        <div className="flex flex-wrap gap-1.5">
          {SOIL.map((s) => (
            <Pill
              key={s.value}
              small
              active={section.labels.soilTexture === s.value}
              onClick={() =>
                onUpdate({
                  labels: {
                    ...section.labels,
                    soilTexture: section.labels.soilTexture === s.value ? undefined : s.value,
                  },
                })
              }
            >
              {s.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>

      {/* ── Density style ── */}
      <FieldGroup label="Planting style">
        <div className="grid gap-2 sm:grid-cols-2">
          {DENSITY.map((d) => {
            const active = section.densityStyle === d.value
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => onUpdate({ densityStyle: d.value })}
                aria-pressed={active}
                className={
                  'rounded-lg border px-3 py-2 text-left transition ' +
                  (active
                    ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                    : 'border-[#2a1d10]/25 bg-[#fff6df]/70 text-[#2a1d10] hover:border-[#2a1d10]/60')
                }
              >
                <span className="block text-sm font-medium">{d.label}</span>
                <span className={'mt-0.5 block text-xs ' + (active ? 'text-[#f7e9c9]/75' : 'text-[#2a1d10]/60')}>
                  {d.blurb}
                </span>
              </button>
            )
          })}
        </div>
      </FieldGroup>

      {/* ── Live estimate — the manageability payoff ── */}
      <EstimatePanel
        densityStyle={section.densityStyle}
        areaFt2={areaFt2}
        priceText={priceText}
        unitPrice={unitPrice}
        onPriceText={setPriceText}
      />

      {/* ── Rollout ── */}
      <FieldGroup label="Where it's at today">
        <div className="flex flex-wrap gap-1.5">
          {PHASE_STATES.map((p) => (
            <Pill
              key={p.value}
              small
              active={section.phaseState === p.value}
              onClick={() => onUpdate({ phaseState: p.value })}
            >
              {p.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Planned season" hint="CA planting window is roughly Sep–Nov.">
        <input
          type="text"
          value={section.plannedSeason ?? ''}
          onChange={(e) => onUpdate({ plannedSeason: e.target.value || undefined })}
          placeholder="fall 2026"
          className="w-40 rounded-md border border-[#2a1d10]/25 bg-white/70 px-3 py-2 text-base text-[#2a1d10] placeholder:text-[#2a1d10]/40 focus:border-[#2a1d10]/60 focus:outline-none"
        />
      </FieldGroup>

      <FieldGroup label="Holding it until then" hint="Suppress weeds while a section waits its turn.">
        <div className="flex flex-wrap gap-1.5">
          {HOLD_METHODS.map((h) => (
            <Pill
              key={h.value}
              small
              active={section.holdMethod === h.value}
              onClick={() =>
                onUpdate({ holdMethod: section.holdMethod === h.value ? undefined : h.value })
              }
            >
              {h.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>
    </div>
  )
}

/**
 * The per-section estimate, shown live. Before a density style is picked it's a
 * gentle nudge (the count depends on the style); after, it's the count / effort
 * / cost read straight off `estimateSection`. Naturalistic sections show the
 * four-layer split; landscaped is one lump (estimate.ts models it as such).
 */
function EstimatePanel({
  densityStyle,
  areaFt2,
  priceText,
  unitPrice,
  onPriceText,
}: {
  densityStyle: DensityStyle | undefined
  areaFt2: number
  priceText: string
  unitPrice: number
  onPriceText: (v: string) => void
}) {
  const roundedArea = Math.round(areaFt2)

  if (!densityStyle) {
    return (
      <div className="rounded-md border border-dashed border-[#2a1d10]/25 bg-[#fff6df]/60 px-3 py-2.5 text-sm text-[#2a1d10]/65">
        About {roundedArea} sq ft. Pick a planting style above and we&rsquo;ll rough
        out how many plants — and roughly how much of a weekend — this bed is.
      </div>
    )
  }

  const est = estimateSection(densityStyle, areaFt2, { unitPrice })

  return (
    <div className="rounded-md border border-[#2a1d10]/15 bg-emerald-800/5 px-3 py-3 space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-[#2a1d10]">{est.effortLabel}</span>
        <span className="text-xs text-[#2a1d10]/55">≈ {roundedArea} sq ft</span>
      </div>

      {densityStyle === 'naturalistic' && est.totalCount > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#2a1d10]/70">
          <li>structural {est.byLayer.structural}</li>
          <li>seasonal {est.byLayer.seasonal}</li>
          <li>groundcover {est.byLayer.groundcover}</li>
          <li>filler {est.byLayer.filler}</li>
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm text-[#2a1d10]/80">
        <span>
          Rough cost{' '}
          <strong className="text-[#2a1d10]">
            ${est.costLow.toLocaleString()}–${est.costHigh.toLocaleString()}
          </strong>{' '}
          at
        </span>
        <span className="inline-flex items-center gap-1">
          $
          <input
            type="number"
            min={0}
            value={priceText}
            onChange={(e) => onPriceText(e.target.value)}
            aria-label="Unit price per plant"
            className="w-16 rounded-md border border-[#2a1d10]/25 bg-white/70 px-2 py-1 text-sm text-[#2a1d10] focus:border-[#2a1d10]/60 focus:outline-none"
          />
          <span className="text-[#2a1d10]/55">/ plant</span>
        </span>
      </div>
      <p className="text-xs text-[#2a1d10]/50">
        A rough feel, not a shopping list — a 1-gal native runs about $12. The real
        count lands once you place plants.
      </p>
    </div>
  )
}

// ── Sidebar: the rollout plan ─────────────────────────────────────────────────

/**
 * The section list *is* the rollout plan. Each row reads as a plan line:
 * name · phase state · planned season · hold method ("fall 2026: back fence bed ·
 * under cardboard until then"). Clicking a row selects the section for editing.
 */
function RolloutList({
  sections,
  selectedId,
  onSelect,
}: {
  sections: Section[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        Your rollout plan
      </p>
      <p className="mb-2 text-xs text-[#2a1d10]/55">
        One section at a time — the rest can wait under cover. Momentum beats ambition.
      </p>
      <ul className="space-y-2">
        {sections.map((section) => {
          const active = section.id === selectedId
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                className={
                  'w-full rounded-md border px-3 py-2 text-left text-sm transition ' +
                  (active
                    ? 'border-[#a9762f] bg-[#fff6df]'
                    : 'border-[#2a1d10]/15 bg-[#fff6df]/70 hover:border-[#2a1d10]/40')
                }
              >
                <span className="font-medium text-[#2a1d10]">{section.name}</span>
                <span className="text-[#2a1d10]/60"> · {rolloutSummary(section)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** "in cleanup · fall 2026 · under cardboard until then" — the rollout line. */
function rolloutSummary(section: Section): string {
  const parts: string[] = [phaseLabel(section.phaseState)]
  if (section.plannedSeason) parts.push(section.plannedSeason)
  if (section.holdMethod && section.holdMethod !== 'none') {
    parts.push(`under ${holdLabel(section.holdMethod)} until then`)
  }
  return parts.join(' · ')
}

function phaseLabel(state: PhaseState): string {
  return PHASE_STATES.find((p) => p.value === state)?.label ?? state
}

function holdLabel(method: NonNullable<Section['holdMethod']>): string {
  return HOLD_METHODS.find((h) => h.value === method)?.label ?? method
}

/**
 * A seed hint from the read-only SiteProfile — a nudge, never a write. Moisture
 * borrows the pooling-spots note; soil borrows the walkthrough's texture. Blank
 * when the profile has nothing to offer.
 */
function seededHint(profile: SiteProfile | null, field: 'moisture' | 'soil'): string | undefined {
  if (!profile) return undefined
  if (field === 'moisture') {
    const pooling = profile.waterSlope?.poolingSpots?.trim()
    return pooling ? `From your walkthrough: water pools at ${pooling}.` : undefined
  }
  const texture = profile.soil?.texture
  return texture && texture !== 'unsure'
    ? `Your walkthrough noted ${texture} soil across the yard.`
    : undefined
}

// ── Small shared primitives (match BaseMapStep / PathsStep) ──────────────────

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-[#2a1d10]/55">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function Pill({
  children,
  active,
  small,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  small?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-full border transition ' +
        (small ? 'px-2.5 py-1 text-xs ' : 'px-3.5 py-1.5 text-sm ') +
        (active
          ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
          : 'border-[#2a1d10]/30 bg-[#fff6df]/70 text-[#2a1d10]/80 hover:border-[#2a1d10]/60 hover:text-[#2a1d10]')
      }
    >
      {children}
    </button>
  )
}
