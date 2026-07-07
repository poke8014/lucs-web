'use client'

import { useEffect, useState } from 'react'
import CanvasStage, { useStage } from './CanvasStage'
import { newId } from './plan'
import type { GardenPlan, PathFeature, Point } from './types'

// ── Flow step 2: paths ───────────────────────────────────────────────────────
// The anti-blank-canvas move (vault/concepts/paths-first-design): before you
// think about beds, draw where your feet already go. Paths carve the yard into
// rooms, and the rooms become the sections in step 3. Desire lines first, then
// the planned ones; keyhole spurs make deep beds reachable.
//
// Interaction mirrors the base-map trace: click on empty canvas to drop points
// (the CanvasStage `onBackgroundPointerDown` seam), Enter or double-click to
// finish, Escape to cancel. Unlike boundary/section polygons, a path is an
// *open* polyline — no closing back to the first point.

const WIDTH_PRESETS = [2, 3, 4] as const
const DEFAULT_WIDTH_FT = 3

const SURFACES: { value: NonNullable<PathFeature['surface']>; label: string }[] = [
  { value: 'existing', label: 'already there' },
  { value: 'mulch', label: 'mulch' },
  { value: 'gravel', label: 'gravel' },
  { value: 'stepping_stones', label: 'stepping stones' },
  { value: 'paver', label: 'pavers' },
]

export interface PathsStepProps {
  plan: GardenPlan
  onChange: (next: GardenPlan) => void
}

export default function PathsStep({ plan, onChange }: PathsStepProps) {
  const baseMap = plan.baseMap
  const paths = plan.paths

  // The in-progress polyline lives in the step (like the base-map draft) so the
  // CanvasStage click handler and the layer that draws the draft share one
  // source of truth.
  const [draft, setDraft] = useState<Point[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function patchPaths(next: PathFeature[]) {
    onChange({ ...plan, paths: next, updatedAt: new Date().toISOString() })
  }

  function commitDraft() {
    // A path needs at least two points to be a line.
    if (draft.length >= 2) {
      const path: PathFeature = { id: newId(), polyline: draft, widthFt: DEFAULT_WIDTH_FT }
      patchPaths([...paths, path])
      setSelectedId(path.id)
    }
    setDraft([])
  }

  function onCanvasTap(p: Point) {
    // A tap on empty canvas extends the current path. Selection happens by
    // tapping a drawn path (handled in the layer); a background tap starts /
    // continues a draft, so we also clear any current selection.
    setSelectedId(null)
    setDraft((d) => [...d, p])
  }

  // Keyboard: Enter finishes the current path, Escape cancels it. Only active
  // while a draft is in flight so it never steals keys from form fields.
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

  function updatePath(id: string, patch: Partial<PathFeature>) {
    patchPaths(paths.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function movePathVertex(id: string, i: number, p: Point) {
    patchPaths(
      paths.map((path) =>
        path.id === id
          ? { ...path, polyline: path.polyline.map((v, idx) => (idx === i ? p : v)) }
          : path,
      ),
    )
  }

  function deletePath(id: string) {
    patchPaths(paths.filter((p) => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const selected = paths.find((p) => p.id === selectedId) ?? null

  return (
    <section className="space-y-5">
      <div className="space-y-2 text-sm text-[#2a1d10]/80 sm:text-base">
        <p>
          Start with the paths you already walk — where do your feet go? The trip
          to the compost, the line from the gate to the door. Draw those first,
          then any you&rsquo;d like to add.
        </p>
        <p className="text-[#2a1d10]/65">
          Paths quietly carve the yard into rooms, which become your sections next
          — it&rsquo;s the easiest way past a blank canvas. For a deep bed, a
          little keyhole spur off the main path keeps the middle reachable so you
          never have to trample plants to weed.
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
          <PathLayer
            paths={paths}
            draft={draft}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMoveVertex={movePathVertex}
          />
        </CanvasStage>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#2a1d10]/55">
          Click to drop points along a path. Press Enter or double-click to
          finish it, Escape to start over. Click a finished path to adjust it.
        </p>
        {draft.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#2a1d10]/60">
              {draft.length} point{draft.length === 1 ? '' : 's'}
            </span>
            {draft.length >= 2 && (
              <button
                type="button"
                onClick={commitDraft}
                className="rounded-md bg-[#2a1d10] px-3 py-1 text-[#f7e9c9] hover:bg-[#3d2a18]"
              >
                Finish path
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
        <PathDetail
          path={selected}
          onUpdate={(patch) => updatePath(selected.id, patch)}
          onDelete={() => deletePath(selected.id)}
        />
      )}

      {paths.length > 0 && (
        <PathList
          paths={paths}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={deletePath}
        />
      )}
    </section>
  )
}

// ── Canvas layer: stroked polylines in feet-space ─────────────────────────────

/**
 * Draws committed paths as stroked polylines whose stroke width is the path's
 * `widthFt` rendered in feet-space (so a 3-ft path looks 3 ft wide at any zoom),
 * plus the in-progress draft. The selected path shows draggable vertex handles.
 * The stroke is a soft, walkable tan — paths read as ground, not as ink.
 */
function PathLayer({
  paths,
  draft,
  selectedId,
  onSelect,
  onMoveVertex,
}: {
  paths: PathFeature[]
  draft: Point[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMoveVertex: (id: string, i: number, p: Point) => void
}) {
  const stage = useStage()

  return (
    <g>
      {paths.map((path) => {
        const screen = path.polyline.map((p) => stage.toScreen(p))
        const d = screen.map((s) => `${s.sx},${s.sy}`).join(' ')
        const selected = path.id === selectedId
        // widthFt in feet → screen px via the viewport scale, so the path keeps
        // its real width at every zoom level.
        const strokePx = Math.max(2, path.widthFt * stage.vp.scale)
        return (
          <g key={path.id}>
            {/* A wide, hit-friendly transparent line for selection. */}
            <polyline
              points={d}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(strokePx, 14)}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation()
                onSelect(path.id)
              }}
            />
            <polyline
              points={d}
              fill="none"
              stroke={selected ? '#a9762f' : '#c9a86a'}
              strokeOpacity={0.85}
              strokeWidth={strokePx}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
            {selected &&
              screen.map((s, i) => (
                <PathVertexHandle
                  key={i}
                  sx={s.sx}
                  sy={s.sy}
                  onDrag={(e) => onMoveVertex(path.id, i, stage.eventToFeet(e))}
                />
              ))}
          </g>
        )
      })}

      {/* In-progress draft — dashed, with dots on each dropped point. */}
      {draft.length > 0 && (
        <g pointerEvents="none">
          <polyline
            points={draft.map((p) => {
              const s = stage.toScreen(p)
              return `${s.sx},${s.sy}`
            }).join(' ')}
            fill="none"
            stroke="#2a1d10"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          {draft.map((p, i) => {
            const s = stage.toScreen(p)
            return <circle key={i} cx={s.sx} cy={s.sy} r={4} fill={i === 0 ? '#a9762f' : '#2a1d10'} />
          })}
        </g>
      )}
    </g>
  )
}

function PathVertexHandle({
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
      stroke="#a9762f"
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

// ── Per-path detail: width preset, surface, delete ────────────────────────────

function PathDetail({
  path,
  onUpdate,
  onDelete,
}: {
  path: PathFeature
  onUpdate: (patch: Partial<PathFeature>) => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">Selected path</p>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-[#7a3b12] underline-offset-2 hover:underline"
        >
          delete path
        </button>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">Width</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {WIDTH_PRESETS.map((w) => (
            <Pill key={w} active={path.widthFt === w} onClick={() => onUpdate({ widthFt: w })}>
              {w} ft
            </Pill>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">Surface</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SURFACES.map((s) => (
            <Pill
              key={s.value}
              small
              active={path.surface === s.value}
              onClick={() => onUpdate({ surface: path.surface === s.value ? undefined : s.value })}
            >
              {s.label}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Path list ─────────────────────────────────────────────────────────────────

function PathList({
  paths,
  selectedId,
  onSelect,
  onDelete,
}: {
  paths: PathFeature[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">Your paths</p>
      <ul className="space-y-2">
        {paths.map((path, i) => {
          const active = path.id === selectedId
          return (
            <li
              key={path.id}
              className={
                'flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm ' +
                (active
                  ? 'border-[#a9762f] bg-[#fff6df]'
                  : 'border-[#2a1d10]/15 bg-[#fff6df]/70')
              }
            >
              <button
                type="button"
                onClick={() => onSelect(path.id)}
                className="font-medium text-[#2a1d10] hover:underline underline-offset-2"
              >
                Path {i + 1}
              </button>
              <span className="text-[#2a1d10]/60">
                {path.widthFt} ft{path.surface ? ` · ${surfaceLabel(path.surface)}` : ''}
              </span>
              <button
                type="button"
                onClick={() => onDelete(path.id)}
                className="ml-auto text-[#7a3b12] underline-offset-2 hover:underline"
              >
                remove
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function surfaceLabel(surface: NonNullable<PathFeature['surface']>): string {
  return SURFACES.find((s) => s.value === surface)?.label ?? surface
}

// ── Shared pill (matches BaseMapStep's) ───────────────────────────────────────

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
