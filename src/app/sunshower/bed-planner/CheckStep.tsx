'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadProfile } from '../site-inventory/profile'
import type { SiteProfile } from '../site-inventory/types'
import { nativePlants, plantBySlug } from '../plant-selector/corpus'
import CanvasStage, { useStage } from './CanvasStage'
import AnnotationLayer from './AnnotationLayer'
import AnnotationTools from './AnnotationTools'
import BloomTintLayer from './BloomTintLayer'
import CheckerPanel from './CheckerPanel'
import SeasonScrubber from './SeasonScrubber'
import SunLabelOverlay, { SunLegend } from './SunLabelOverlay'
import SunShadeLayer from './SunShadeLayer'
import TimelapseControls from './TimelapseControls'
import { runChecks, type Finding } from './checks'
import { bloomCounts, bloomingSlugs } from './bloom'
import { useBlobUrl, type BlobStore } from './blobStore'
import { createAnnotation, POINT_ANNOTATION_KINDS } from './annotations'
import { polygonCentroid } from './geometry'
import { useCheckPrefs } from './useCheckPrefs'
import type { Season, TimeOfDay } from './sun'
import type { Annotation, BaseMap, GardenPlan, PathFeature, Point, Section } from './types'

// ── Flow step 5: check & preview ─────────────────────────────────────────────
// The workspace where a finished-enough plan gets read back to you. Three things
// share this screen, all off one season control:
//
//   • a gentle design checker (unit F) — invitations, never scolds
//   • a bloom tint (unit G) that warms up what's flowering each season
//   • a sun/shade timelapse (unit H) whose shadows sweep the plan by season +
//     time of day, so "what does winter shade actually cover?" has an answer
//     without waiting a year
//
// The canvas is read-only here — a preview of everything drawn in steps 1–4, with
// three toggleable overlays on top. Annotations (unit G) are the one thing you can
// still add: tap a kind, tap the canvas, drop a marker. Nothing is ever final —
// the plan strip's "try a variant" fork is one tap away.

export interface CheckStepProps {
  plan: GardenPlan
  onChange: (next: GardenPlan) => void
  blobStore: BlobStore
  /** Jump to a section back in the Sections step (best-effort finding follow). */
  onJumpToSection?: (sectionId: string) => void
}

export default function CheckStep({ plan, onChange, blobStore, onJumpToSection }: CheckStepProps) {
  const baseMap = plan.baseMap
  const sections = plan.sections
  const corpus = useMemo(() => nativePlants(), [])

  const [profile, setProfile] = useState<SiteProfile | null>(null)
  useEffect(() => {
    // One-time read of the read-only SiteProfile after mount (SSR-safe).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile())
  }, [])

  // One shared season (drives bloom tint + shadow overlay), and a local
  // time-of-day (shadow overlay only). Spec: one season control for both.
  const [season, setSeason] = useState<Season>('summer')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midday')

  // Overlay toggles — bloom + shadows on by default, sun-label tint off.
  const [showBloom, setShowBloom] = useState(true)
  const [showShadows, setShowShadows] = useState(true)
  const [showSunLabels, setShowSunLabels] = useState(false)

  // Bloom badges on the season pills + the slug set for the active season.
  const counts = useMemo(() => bloomCounts(plan.placements, corpus), [plan.placements, corpus])
  const bloomBySlug = useMemo(() => bloomingSlugs(corpus, season), [corpus, season])

  // Checker — findings + per-plan dismissal memory.
  const findings = useMemo(
    () => runChecks(plan, profile, corpus),
    [plan, profile, corpus],
  )
  const { dismissedKeys, dismiss, restore } = useCheckPrefs(plan.id)
  const sectionNames = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.id, s.name])),
    [sections],
  )

  function jumpTo(finding: Finding) {
    if (finding.sectionId) onJumpToSection?.(finding.sectionId)
  }

  // ── Annotations ──────────────────────────────────────────────────────────
  // Point kinds are tap-to-place here; polygon kinds (only `utility`) would need
  // the full vertex-trace interaction, which this read-only preview doesn't run —
  // so the tools offer point kinds and we note polygon tracing lives back in the
  // editing steps. See the AnnotationTools context cue below.
  const [activeKind, setActiveKind] = useState<Annotation['kind'] | null>(null)
  const [pendingNote, setPendingNote] = useState('')
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)

  function patchAnnotations(next: Annotation[]) {
    onChange({ ...plan, annotations: next, updatedAt: new Date().toISOString() })
  }

  function onCanvasTap(p: Point) {
    // No active kind → a background tap clears the annotation selection.
    if (!activeKind) {
      setSelectedAnnotationId(null)
      return
    }
    // Only point kinds place from a single tap here (see note above).
    if (!POINT_ANNOTATION_KINDS.includes(activeKind)) return
    const note = activeKind === 'note' ? pendingNote : undefined
    const annotation = createAnnotation(activeKind, p, note)
    patchAnnotations([...plan.annotations, annotation])
    setSelectedAnnotationId(annotation.id)
    if (activeKind === 'note') setPendingNote('')
  }

  function deleteAnnotation(id: string) {
    patchAnnotations(plan.annotations.filter((a) => a.id !== id))
    if (selectedAnnotationId === id) setSelectedAnnotationId(null)
  }

  const nothingDrawn =
    sections.length === 0 && plan.placements.length === 0 && plan.paths.length === 0

  return (
    <section className="space-y-5">
      <div className="space-y-2 text-sm text-[#2a1d10]/80 sm:text-base">
        <p>
          Here&rsquo;s the whole plan in one place. Scrub the seasons to watch what
          blooms and where the shade falls, and read the gentle notes on the right —
          they&rsquo;re nudges, not rules.
        </p>
        {nothingDrawn && (
          <p className="text-[#2a1d10]/65">
            There&rsquo;s not much to preview yet — map a base, carve a few sections,
            and place some plants in the earlier steps, then come back to see it come
            together. Like what you have? Fork it from the plan strip above and try a
            bolder version — plans are cheap and gardens are never finished.
          </p>
        )}
      </div>

      {/* Season control — the one source for bloom + shadows. */}
      <SeasonScrubber season={season} onChange={setSeason} bloomCounts={counts} />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {/* Preview canvas + overlays */}
        <div className="space-y-3">
          <OverlayToggles
            showBloom={showBloom}
            showShadows={showShadows}
            showSunLabels={showSunLabels}
            onBloom={setShowBloom}
            onShadows={setShowShadows}
            onSunLabels={setShowSunLabels}
          />

          <div className="relative h-[26rem] overflow-hidden rounded-lg border border-[#2a1d10]/20 sm:h-[32rem]">
            <CanvasStage
              widthFt={baseMap.widthFt}
              heightFt={baseMap.heightFt}
              northBearingDeg={baseMap.northBearingDeg ?? 0}
              className="h-full w-full"
              onBackgroundPointerDown={onCanvasTap}
            >
              {/* Read-only base, drawn back-to-front. */}
              <PreviewImageLayer baseMap={baseMap} blobStore={blobStore} />
              <PreviewBaseLayer baseMap={baseMap} />
              <PreviewPathLayer paths={plan.paths} />
              <PreviewSectionLayer sections={sections} />

              {/* Overlays. */}
              {showSunLabels && <SunLabelOverlay sections={sections} visible />}
              {showShadows && (
                <SunShadeLayer
                  obstructions={baseMap.obstructions}
                  season={season}
                  timeOfDay={timeOfDay}
                  northBearingDeg={baseMap.northBearingDeg ?? 0}
                />
              )}
              {showBloom && (
                <BloomTintLayer
                  placements={plan.placements}
                  sections={sections}
                  season={season}
                  bySlug={bloomBySlug}
                  plantBySlug={plantBySlug}
                />
              )}

              {/* Annotations sit on top so they stay tappable/selectable. */}
              <AnnotationLayer
                annotations={plan.annotations}
                selectedId={selectedAnnotationId}
                onSelect={setSelectedAnnotationId}
              />
            </CanvasStage>

            {showSunLabels && (
              <SunLegend className="pointer-events-none absolute bottom-14 left-3" />
            )}
          </div>

          {/* Time-of-day scrub for the shadow overlay; its season pills mirror the
              shared season above. */}
          {showShadows && (
            <TimelapseControls
              season={season}
              timeOfDay={timeOfDay}
              onChange={({ season: s, timeOfDay: t }) => {
                setSeason(s)
                setTimeOfDay(t)
              }}
            />
          )}

          <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-4">
            <AnnotationTools
              activeKind={activeKind}
              onKindChange={(k) => {
                // This preview only tap-places point kinds; polygon kinds are
                // drawn back in the editing steps.
                setActiveKind(k && POINT_ANNOTATION_KINDS.includes(k) ? k : null)
              }}
              pendingNote={pendingNote}
              onNoteChange={setPendingNote}
              onDelete={deleteAnnotation}
              selectedId={selectedAnnotationId}
            />
            <p className="mt-2 text-xs text-[#2a1d10]/50">
              Marking a spot? Tap a kind, then tap the map. Fenced-off utility runs
              are traced back in the Base map step.
            </p>
          </div>
        </div>

        {/* Checker */}
        <div>
          <CheckerPanel
            findings={findings}
            dismissedKeys={dismissedKeys}
            onDismiss={dismiss}
            onRestore={restore}
            onJump={onJumpToSection ? jumpTo : undefined}
            sectionNames={sectionNames}
          />
        </div>
      </div>
    </section>
  )
}

// ── Overlay toggles ───────────────────────────────────────────────────────────

function OverlayToggles({
  showBloom,
  showShadows,
  showSunLabels,
  onBloom,
  onShadows,
  onSunLabels,
}: {
  showBloom: boolean
  showShadows: boolean
  showSunLabels: boolean
  onBloom: (v: boolean) => void
  onShadows: (v: boolean) => void
  onSunLabels: (v: boolean) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#2a1d10]/55">
        Show
      </span>
      <ToggleChip active={showBloom} onClick={() => onBloom(!showBloom)}>
        Bloom
      </ToggleChip>
      <ToggleChip active={showShadows} onClick={() => onShadows(!showShadows)}>
        Sun &amp; shade
      </ToggleChip>
      <ToggleChip active={showSunLabels} onClick={() => onSunLabels(!showSunLabels)}>
        Sun labels
      </ToggleChip>
    </div>
  )
}

function ToggleChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-full border px-3 py-1 text-xs transition ' +
        (active
          ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
          : 'border-[#2a1d10]/25 bg-transparent text-[#2a1d10]/70 hover:border-[#2a1d10]/50')
      }
    >
      {children}
    </button>
  )
}

// ── Read-only preview layers ──────────────────────────────────────────────────
// These mirror the editor layers (BaseMapStep / PathsStep / SectionsStep) minus
// every interaction — no drag handles, no selection, no draft. The step-5 canvas
// is a preview: everything drawn earlier, shown as it stands.

/** The uploaded base-map image, under everything, at its stored opacity. */
function PreviewImageLayer({ baseMap, blobStore }: { baseMap: BaseMap; blobStore: BlobStore }) {
  const stage = useStage()
  const url = useBlobUrl(baseMap.imageKey, blobStore)
  if (!url) return null
  const tl = stage.toScreen({ x: 0, y: 0 })
  const br = stage.toScreen({ x: baseMap.widthFt, y: baseMap.heightFt })
  return (
    <image
      href={url}
      x={tl.sx}
      y={tl.sy}
      width={br.sx - tl.sx}
      height={br.sy - tl.sy}
      opacity={baseMap.imageOpacity ?? 0.6}
      preserveAspectRatio="none"
      pointerEvents="none"
    />
  )
}

/** Yard boundary (if traced) + obstruction footprints — read-only. */
function PreviewBaseLayer({ baseMap }: { baseMap: BaseMap }) {
  const stage = useStage()
  return (
    <g pointerEvents="none">
      {baseMap.boundary && baseMap.boundary.length >= 3 && (
        <polygon
          points={baseMap.boundary.map((p) => {
            const s = stage.toScreen(p)
            return `${s.sx},${s.sy}`
          }).join(' ')}
          fill="none"
          stroke="#2a1d10"
          strokeOpacity={0.45}
          strokeWidth={2}
        />
      )}
      {baseMap.obstructions.map((ob) =>
        ob.footprint.length >= 3 ? (
          <polygon
            key={ob.id}
            points={ob.footprint.map((p) => {
              const s = stage.toScreen(p)
              return `${s.sx},${s.sy}`
            }).join(' ')}
            fill="rgba(42,29,16,0.10)"
            stroke="#2a1d10"
            strokeOpacity={0.35}
            strokeWidth={1.5}
          />
        ) : null,
      )}
    </g>
  )
}

/** Paths as walkable-tan strokes at their real width — read-only. */
function PreviewPathLayer({ paths }: { paths: PathFeature[] }) {
  const stage = useStage()
  return (
    <g pointerEvents="none">
      {paths.map((path) => {
        const d = path.polyline.map((p) => {
          const s = stage.toScreen(p)
          return `${s.sx},${s.sy}`
        }).join(' ')
        const strokePx = Math.max(2, path.widthFt * stage.vp.scale)
        return (
          <polyline
            key={path.id}
            points={d}
            fill="none"
            stroke="#c9a86a"
            strokeOpacity={0.85}
            strokeWidth={strokePx}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
    </g>
  )
}

/** Section polygons with name labels — read-only (no handles, no selection). */
function PreviewSectionLayer({ sections }: { sections: Section[] }) {
  const stage = useStage()
  return (
    <g pointerEvents="none">
      {sections.map((section, i) => {
        const d = section.polygon.map((p) => {
          const s = stage.toScreen(p)
          return `${s.sx},${s.sy}`
        }).join(' ')
        const label = stage.toScreen(polygonCentroid(section.polygon))
        return (
          <g key={section.id}>
            <polygon
              points={d}
              fill="rgba(74,93,35,0.10)"
              stroke="#6b7d3a"
              strokeWidth={1.5}
            />
            <text
              x={label.sx}
              y={label.sy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              fill="#2a1d10"
              fillOpacity={0.75}
              stroke="#f7e9c9"
              strokeWidth={3}
              paintOrder="stroke"
              style={{ fontWeight: 600 }}
            >
              {section.name || `Section ${i + 1}`}
            </text>
          </g>
        )
      })}
    </g>
  )
}
