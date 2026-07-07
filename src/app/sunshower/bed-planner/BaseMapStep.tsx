'use client'

import { useEffect, useRef, useState } from 'react'
import { loadProfile } from '../site-inventory/profile'
import CanvasStage, { useStage } from './CanvasStage'
import { importAddress } from './addressImport'
import {
  heightFtToStory,
  northBearingFromAspect,
  rectangleBoundary,
  storyToHeightFt,
  type StoryPreset,
} from './baseMapMath'
import { createMemoryBlobStore, useBlobUrl, type BlobStore } from './blobStore'
import { newId } from './plan'
import type { BaseMap, GardenPlan, Obstruction, Point } from './types'

// ── Flow step 1: the base map ────────────────────────────────────────────────
// Three ways in, presented with equal weight (spec §Scope decisions):
//   1. Address import — traces a rough outline, used once and forgotten.
//   2. Image upload + scale calibration.
//   3. Draw a rectangle + type its size.
// Then refinement tools on the canvas: edit the yard boundary, trace
// obstructions, set the north bearing. No step is a prerequisite for the next —
// this is a workspace, and plans always change.

type OnRamp = 'address' | 'image' | 'rectangle'
type Tool = 'boundary' | 'obstruction'

const CLOSE_TOLERANCE_FT = 3 // click within this of the first corner to close a trace

export interface BaseMapStepProps {
  plan: GardenPlan
  onChange: (next: GardenPlan) => void
  /**
   * Where uploaded base-map images live. Unit D passes the IndexedDB-backed
   * store (persistentBlobStore) so images survive a reload; when omitted this
   * step owns a session-only in-memory one (its unit-B default, still handy for
   * standalone use). Interface unchanged — components only ever see keys + URLs.
   */
  blobStore?: BlobStore
}

export default function BaseMapStep({ plan, onChange, blobStore }: BaseMapStepProps) {
  const baseMap = plan.baseMap

  // A session-only in-memory fallback we own — used only when the parent didn't
  // pass a store. A lazy useState makes it render-safe to read (a bare Map + a
  // couple closures, no side effects until an image is stored). Disposed on
  // unmount; the parent-owned store is disposed by the parent.
  const [ownedStore] = useState(() => createMemoryBlobStore())
  useEffect(() => {
    if (blobStore) return // parent owns disposal when it supplied the store
    return () => ownedStore.dispose()
  }, [blobStore, ownedStore])
  const activeBlobStore: BlobStore = blobStore ?? ownedStore

  // Seed the north bearing once from the read-only SiteProfile. We only read
  // the profile — never write it back (spec: one-way flow).
  const seededNorth = useRef(false)
  useEffect(() => {
    if (seededNorth.current) return
    seededNorth.current = true
    if (baseMap.northBearingDeg !== undefined) return
    const profile = loadProfile()
    const seeded = northBearingFromAspect(profile.aspect?.cardinal)
    patchBaseMap({ northBearingDeg: seeded })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [tool, setTool] = useState<Tool>('boundary')
  const [obstructionKind, setObstructionKind] = useState<Obstruction['kind']>('building')
  // The in-progress trace lives here (not in the layer) so the click handler we
  // hand to CanvasStage and the layer that draws the draft share one source of
  // truth — the stage already tells tap from drag, so no second hit-surface.
  const [draft, setDraft] = useState<Point[]>([])

  function patchBaseMap(patch: Partial<BaseMap>) {
    onChange({ ...plan, baseMap: { ...plan.baseMap, ...patch }, updatedAt: new Date().toISOString() })
  }

  function commitTrace(points: Point[]) {
    if (points.length < 3) return
    if (tool === 'boundary') {
      patchBaseMap({ boundary: points })
    } else {
      const next: Obstruction = {
        id: newId(),
        kind: obstructionKind,
        footprint: points,
        // Buildings start at a one-story guess (the shade timelapse will want a
        // height); the user tunes it in the list below. Trees carry the
        // deciduous flag so winter shade behaves.
        ...(obstructionKind === 'building' ? { heightFt: storyToHeightFt(1) } : {}),
        ...(obstructionKind === 'tree' ? { deciduous: false } : {}),
      }
      patchBaseMap({ obstructions: [...baseMap.obstructions, next] })
    }
  }

  // A background tap either extends the current trace or closes it when it lands
  // back near the first corner.
  function onCanvasTap(p: Point) {
    if (draft.length >= 3) {
      const first = draft[0]
      if (Math.hypot(p.x - first.x, p.y - first.y) <= CLOSE_TOLERANCE_FT) {
        commitTrace(draft)
        setDraft([])
        return
      }
    }
    setDraft((d) => [...d, p])
  }

  return (
    <section className="space-y-6">
      <p className="text-sm text-[#2a1d10]/80 sm:text-base">
        Let&rsquo;s get a rough map of your yard. Pick whichever way is least
        effort for you — you&rsquo;ll fix it up by hand afterward, and none of
        these is more &ldquo;right&rdquo; than the others. Plans always change.
      </p>

      <OnRampChooser
        baseMap={baseMap}
        blobStore={activeBlobStore}
        onBaseMap={patchBaseMap}
      />

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
          Refine on the canvas
        </p>
        <ToolBar
          tool={tool}
          onTool={(t) => {
            setTool(t)
            setDraft([]) // switching tools abandons any half-drawn trace
          }}
          obstructionKind={obstructionKind}
          onObstructionKind={setObstructionKind}
        />
        <div className="mt-2 h-[26rem] overflow-hidden rounded-lg border border-[#2a1d10]/20 sm:h-[32rem]">
          <CanvasStage
            widthFt={baseMap.widthFt}
            heightFt={baseMap.heightFt}
            northBearingDeg={baseMap.northBearingDeg ?? 0}
            className="h-full w-full"
            onBackgroundPointerDown={onCanvasTap}
          >
            <BaseMapImageLayer baseMap={baseMap} blobStore={activeBlobStore} />
            <BoundaryObstructionLayer
              baseMap={baseMap}
              tool={tool}
              draft={draft}
              onBaseMap={patchBaseMap}
            />
          </CanvasStage>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#2a1d10]/55">
            {tool === 'boundary'
              ? 'Click to drop boundary corners; drag a corner to move it; double-click a corner to remove it. The yard outline is just a guide — rough is fine.'
              : `Click to trace a ${obstructionKind}; drag corners to adjust. Click back near the first corner to close the shape.`}
          </p>
          {draft.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#2a1d10]/60">{draft.length} corner{draft.length === 1 ? '' : 's'}</span>
              {draft.length >= 3 && (
                <button
                  type="button"
                  onClick={() => {
                    commitTrace(draft)
                    setDraft([])
                  }}
                  className="rounded-md bg-[#2a1d10] px-3 py-1 text-[#f7e9c9] hover:bg-[#3d2a18]"
                >
                  Finish shape
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
      </div>

      <NorthField
        bearingDeg={baseMap.northBearingDeg ?? 0}
        onChange={(deg) => patchBaseMap({ northBearingDeg: deg })}
      />

      <ObstructionList baseMap={baseMap} onBaseMap={patchBaseMap} />
    </section>
  )
}

// ── On-ramp chooser: three equal-weight cards ────────────────────────────────

function OnRampChooser({
  baseMap,
  blobStore,
  onBaseMap,
}: {
  baseMap: BaseMap
  blobStore: BlobStore
  onBaseMap: (patch: Partial<BaseMap>) => void
}) {
  const [open, setOpen] = useState<OnRamp>('rectangle')

  const ramps: { id: OnRamp; title: string; blurb: string }[] = [
    {
      id: 'address',
      title: 'Type an address',
      blurb: 'We trace a rough outline from it, then forget the address.',
    },
    {
      id: 'image',
      title: 'Upload a picture',
      blurb: 'A satellite screenshot or a photo of a paper sketch.',
    },
    {
      id: 'rectangle',
      title: 'Draw a rectangle',
      blurb: 'Just type the width and height. No address needed.',
    },
  ]

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        {ramps.map((r) => {
          const active = open === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpen(r.id)}
              aria-pressed={active}
              className={
                'rounded-lg border px-4 py-3 text-left transition ' +
                (active
                  ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                  : 'border-[#2a1d10]/25 bg-[#fff6df]/70 text-[#2a1d10] hover:border-[#2a1d10]/60')
              }
            >
              <span className="block text-base font-medium">{r.title}</span>
              <span className={'mt-0.5 block text-sm ' + (active ? 'text-[#f7e9c9]/75' : 'text-[#2a1d10]/60')}>
                {r.blurb}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3">
        {open === 'address' && <AddressPanel onBaseMap={onBaseMap} />}
        {open === 'image' && (
          <ImagePanel baseMap={baseMap} blobStore={blobStore} onBaseMap={onBaseMap} />
        )}
        {open === 'rectangle' && <RectanglePanel baseMap={baseMap} onBaseMap={onBaseMap} />}
      </div>
    </div>
  )
}

// ── On-ramp 1: address import (privacy-guarded, best-effort) ──────────────────

function AddressPanel({ onBaseMap }: { onBaseMap: (patch: Partial<BaseMap>) => void }) {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function run() {
    setStatus('loading')
    setMessage(null)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const result = await importAddress(address, ctrl.signal)
    if (ctrl.signal.aborted) return
    if (result.ok) {
      // Only de-identified feet-space geometry crosses this boundary — the
      // address and its coordinates stayed inside importAddress.
      onBaseMap({
        widthFt: Math.max(10, result.widthFt),
        heightFt: Math.max(10, result.heightFt),
        boundary: result.boundary,
        obstructions: result.obstructions,
      })
      setStatus('idle')
      setMessage('Traced a starting outline. Nudge the corners on the canvas to match your yard.')
    } else {
      setStatus('error')
      setMessage(result.reason)
    }
  }

  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-4">
      <p className="rounded-md border border-emerald-800/25 bg-emerald-800/10 px-3 py-2 text-sm text-emerald-900">
        We use your address once to trace a starting outline, then forget it —
        nothing links your saved plan to where you live. If you&rsquo;d rather
        not share one, the picture and rectangle paths work just as well.
      </p>
      <label className="mt-3 block text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        Address
      </label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && address.trim()) run()
          }}
          placeholder="123 Main St, San Jose, CA"
          className="min-w-[16rem] flex-1 rounded-md border border-[#2a1d10]/25 bg-white/70 px-3 py-2 text-base text-[#2a1d10] placeholder:text-[#2a1d10]/40 focus:border-[#2a1d10]/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={run}
          disabled={status === 'loading' || !address.trim()}
          className="rounded-md bg-[#2a1d10] px-5 py-2 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18] disabled:opacity-40"
        >
          {status === 'loading' ? 'Tracing…' : 'Trace outline'}
        </button>
      </div>
      {message && (
        <p
          className={
            'mt-2.5 text-sm ' + (status === 'error' ? 'text-[#7a3b12]' : 'text-emerald-900')
          }
        >
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-[#2a1d10]/50">
        Outlines come from OpenStreetMap and are often approximate — a starting
        point, not a survey. If it can&rsquo;t find one, upload a screenshot or
        draw a rectangle instead.
      </p>
    </div>
  )
}

// ── On-ramp 2: image upload + scale calibration + opacity ─────────────────────

function ImagePanel({
  baseMap,
  blobStore,
  onBaseMap,
}: {
  baseMap: BaseMap
  blobStore: BlobStore
  onBaseMap: (patch: Partial<BaseMap>) => void
}) {
  const previewUrl = useBlobUrl(baseMap.imageKey, blobStore)

  async function onFile(file: File | undefined) {
    if (!file) return
    const key = await blobStore.putImage(file)
    onBaseMap({ imageKey: key, imageOpacity: baseMap.imageOpacity ?? 0.6 })
  }

  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-4 space-y-3">
      <label className="block text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        Satellite screenshot or photographed sketch
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0])}
        className="block w-full text-sm text-[#2a1d10] file:mr-3 file:rounded-md file:border-0 file:bg-[#2a1d10] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#f7e9c9] hover:file:bg-[#3d2a18]"
      />
      <p className="text-xs text-[#2a1d10]/55">
        County GIS or USGS imagery both work. So does a phone photo of the
        sketch you made during the site walkthrough.
      </p>

      {previewUrl && (
        <div className="space-y-3">
          {/* A session-only object URL for a user upload — next/image can't
              optimize blob URLs and would be the wrong tool here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Uploaded base map"
            className="max-h-40 rounded border border-[#2a1d10]/20"
          />
          <CalibrationField baseMap={baseMap} onBaseMap={onBaseMap} />
          <div>
            <label className="block text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
              Image opacity
            </label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={baseMap.imageOpacity ?? 0.6}
              onChange={(e) => onBaseMap({ imageOpacity: Number(e.target.value) })}
              className="mt-1 w-full max-w-xs accent-[#2a1d10]"
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Scale calibration: the user tells us a real distance in the image (a fence
 * panel, a driveway) by typing its feet, plus how many pixels long that line
 * looked. In this unit we accept the numbers directly; a drag-a-line-on-the-
 * image gesture is a small later polish. pxPerFt = linePx ÷ knownFt.
 */
function CalibrationField({
  baseMap,
  onBaseMap,
}: {
  baseMap: BaseMap
  onBaseMap: (patch: Partial<BaseMap>) => void
}) {
  const [linePx, setLinePx] = useState('')
  const [knownFt, setKnownFt] = useState('')

  function apply() {
    const px = Number(linePx)
    const ft = Number(knownFt)
    if (px > 0 && ft > 0) onBaseMap({ pxPerFt: px / ft })
  }

  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        Calibrate scale
      </label>
      <p className="mt-1 text-xs text-[#2a1d10]/55">
        Pick something in the image you know the length of. Enter how many
        pixels long it looks and its real length in feet.
      </p>
      <div className="mt-1.5 flex flex-wrap items-end gap-2">
        <NumberBox label="Line (px)" value={linePx} onChange={setLinePx} placeholder="200" />
        <NumberBox label="Real length (ft)" value={knownFt} onChange={setKnownFt} placeholder="8" />
        <button
          type="button"
          onClick={apply}
          className="rounded-md border border-[#2a1d10]/30 bg-[#fff6df] px-3 py-2 text-sm text-[#2a1d10] hover:border-[#2a1d10]/60"
        >
          Set scale
        </button>
      </div>
      {baseMap.pxPerFt !== undefined && (
        <p className="mt-1.5 text-sm text-emerald-900">
          Scale set: {baseMap.pxPerFt.toFixed(1)} px per foot.
        </p>
      )}
    </div>
  )
}

// ── On-ramp 3: draw a rectangle + enter dimensions ────────────────────────────

function RectanglePanel({
  baseMap,
  onBaseMap,
}: {
  baseMap: BaseMap
  onBaseMap: (patch: Partial<BaseMap>) => void
}) {
  const [w, setW] = useState(String(baseMap.widthFt))
  const [h, setH] = useState(String(baseMap.heightFt))

  function apply() {
    const width = Math.max(1, Number(w) || 0)
    const height = Math.max(1, Number(h) || 0)
    onBaseMap({ widthFt: width, heightFt: height, boundary: rectangleBoundary(width, height) })
  }

  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-4">
      <p className="text-sm text-[#2a1d10]/75">
        The simplest start: a plain rectangle you can reshape later. Roughly how
        big is the area you&rsquo;re planning?
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <NumberBox label="Width (ft)" value={w} onChange={setW} placeholder="40" />
        <span className="pb-2 text-[#2a1d10]/50">×</span>
        <NumberBox label="Height (ft)" value={h} onChange={setH} placeholder="30" />
        <button
          type="button"
          onClick={apply}
          className="rounded-md bg-[#2a1d10] px-5 py-2 text-sm font-medium text-[#f7e9c9] hover:bg-[#3d2a18]"
        >
          Set the yard
        </button>
      </div>
    </div>
  )
}

// ── Canvas layers ─────────────────────────────────────────────────────────────

/** The uploaded base-map image, drawn under everything at its opacity. */
function BaseMapImageLayer({ baseMap, blobStore }: { baseMap: BaseMap; blobStore: BlobStore }) {
  const stage = useStage()
  const url = useBlobUrl(baseMap.imageKey, blobStore)

  if (!url) return null
  // Anchor the image to the yard extent so it scales with the transform.
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

/**
 * Boundary + obstruction rendering with draggable corners. The trace itself is
 * driven from BaseMapStep (which owns the draft and the CanvasStage click
 * handler); this layer only draws committed shapes + the in-progress draft, and
 * handles per-vertex edits. Double-clicking a boundary corner removes it.
 */
function BoundaryObstructionLayer({
  baseMap,
  tool,
  draft,
  onBaseMap,
}: {
  baseMap: BaseMap
  tool: Tool
  draft: Point[]
  onBaseMap: (patch: Partial<BaseMap>) => void
}) {
  const stage = useStage()

  function moveBoundaryVertex(i: number, p: Point) {
    if (!baseMap.boundary) return
    onBaseMap({ boundary: baseMap.boundary.map((v, idx) => (idx === i ? p : v)) })
  }

  function deleteBoundaryVertex(i: number) {
    // Keep at least a triangle — a two-point "polygon" isn't a yard.
    if (!baseMap.boundary || baseMap.boundary.length <= 3) return
    onBaseMap({ boundary: baseMap.boundary.filter((_, idx) => idx !== i) })
  }

  function moveObstructionVertex(obsId: string, i: number, p: Point) {
    onBaseMap({
      obstructions: baseMap.obstructions.map((o) =>
        o.id === obsId ? { ...o, footprint: o.footprint.map((v, idx) => (idx === i ? p : v)) } : o,
      ),
    })
  }

  return (
    <g>
      {/* Yard boundary */}
      {baseMap.boundary && baseMap.boundary.length >= 2 && (
        <EditablePolygon
          points={baseMap.boundary}
          stage={stage}
          fill="rgba(120,150,90,0.10)"
          stroke="#4a5d23"
          editable={tool === 'boundary'}
          onMoveVertex={moveBoundaryVertex}
          onDeleteVertex={deleteBoundaryVertex}
        />
      )}

      {/* Obstructions */}
      {baseMap.obstructions.map((o) => (
        <EditablePolygon
          key={o.id}
          points={o.footprint}
          stage={stage}
          fill={OBSTRUCTION_FILL[o.kind]}
          stroke={OBSTRUCTION_STROKE[o.kind]}
          editable={tool === 'obstruction'}
          onMoveVertex={(i, p) => moveObstructionVertex(o.id, i, p)}
          onDeleteVertex={() => {}}
        />
      ))}

      {/* In-progress trace */}
      {draft.length > 0 && <DraftTrace points={draft} stage={stage} />}
    </g>
  )
}

const OBSTRUCTION_FILL: Record<Obstruction['kind'], string> = {
  building: 'rgba(120,90,60,0.22)',
  fence: 'rgba(90,70,50,0.15)',
  tree: 'rgba(60,110,60,0.20)',
  other: 'rgba(90,90,90,0.15)',
}
const OBSTRUCTION_STROKE: Record<Obstruction['kind'], string> = {
  building: '#7a5230',
  fence: '#5a4632',
  tree: '#2f6d2f',
  other: '#555',
}

function EditablePolygon({
  points,
  stage,
  fill,
  stroke,
  editable,
  onMoveVertex,
  onDeleteVertex,
}: {
  points: Point[]
  stage: ReturnType<typeof useStage>
  fill: string
  stroke: string
  editable: boolean
  onMoveVertex: (i: number, p: Point) => void
  onDeleteVertex: (i: number) => void
}) {
  const screen = points.map((p) => stage.toScreen(p))
  const d = screen.map((s) => `${s.sx},${s.sy}`).join(' ')

  return (
    <g>
      <polygon points={d} fill={fill} stroke={stroke} strokeWidth={2} />
      {editable &&
        screen.map((s, i) => (
          <VertexHandle
            key={i}
            sx={s.sx}
            sy={s.sy}
            stroke={stroke}
            onDrag={(e) => onMoveVertex(i, stage.eventToFeet(e))}
            onDelete={() => onDeleteVertex(i)}
          />
        ))}
    </g>
  )
}

function VertexHandle({
  sx,
  sy,
  stroke,
  onDrag,
  onDelete,
}: {
  sx: number
  sy: number
  stroke: string
  onDrag: (e: React.PointerEvent) => void
  onDelete: () => void
}) {
  const dragging = useRef(false)
  return (
    <circle
      cx={sx}
      cy={sy}
      r={6}
      fill="#fff6df"
      stroke={stroke}
      strokeWidth={2}
      style={{ cursor: 'grab' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        dragging.current = true
        ;(e.target as Element).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (dragging.current) {
          e.stopPropagation()
          onDrag(e)
        }
      }}
      onPointerUp={(e) => {
        dragging.current = false
        ;(e.target as Element).releasePointerCapture(e.pointerId)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}
    />
  )
}

function DraftTrace({ points, stage }: { points: Point[]; stage: ReturnType<typeof useStage> }) {
  const screen = points.map((p) => stage.toScreen(p))
  const line = screen.map((s) => `${s.sx},${s.sy}`).join(' ')
  return (
    <g pointerEvents="none">
      <polyline points={line} fill="none" stroke="#2a1d10" strokeWidth={2} strokeDasharray="4 3" />
      {screen.map((s, i) => (
        <circle key={i} cx={s.sx} cy={s.sy} r={4} fill={i === 0 ? '#4a5d23' : '#2a1d10'} />
      ))}
    </g>
  )
}

// ── Toolbar + supporting fields ───────────────────────────────────────────────

function ToolBar({
  tool,
  onTool,
  obstructionKind,
  onObstructionKind,
}: {
  tool: Tool
  onTool: (t: Tool) => void
  obstructionKind: Obstruction['kind']
  onObstructionKind: (k: Obstruction['kind']) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill active={tool === 'boundary'} onClick={() => onTool('boundary')}>
        Edit yard outline
      </Pill>
      <Pill active={tool === 'obstruction'} onClick={() => onTool('obstruction')}>
        Trace obstruction
      </Pill>
      {tool === 'obstruction' && (
        <div className="ml-1 flex flex-wrap gap-1.5">
          {(['building', 'fence', 'tree', 'other'] as Obstruction['kind'][]).map((k) => (
            <Pill key={k} small active={obstructionKind === k} onClick={() => onObstructionKind(k)}>
              {k}
            </Pill>
          ))}
        </div>
      )}
    </div>
  )
}

function NorthField({ bearingDeg, onChange }: { bearingDeg: number; onChange: (deg: number) => void }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        North bearing
      </label>
      <p className="mt-1 text-xs text-[#2a1d10]/55">
        Which way is north, in degrees clockwise from straight up? Seeded from
        your site walkthrough — adjust if it looks off.
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={360}
          value={Math.round(bearingDeg)}
          onChange={(e) => {
            const deg = Number(e.target.value)
            if (Number.isFinite(deg)) onChange(((deg % 360) + 360) % 360)
          }}
          className="w-24 rounded-md border border-[#2a1d10]/25 bg-white/70 px-3 py-2 text-base text-[#2a1d10] focus:border-[#2a1d10]/60 focus:outline-none"
        />
        <span className="text-sm text-[#2a1d10]/60">degrees</span>
      </div>
    </div>
  )
}

/** Compact editor for each traced obstruction — kind echo, height, deciduous. */
function ObstructionList({
  baseMap,
  onBaseMap,
}: {
  baseMap: BaseMap
  onBaseMap: (patch: Partial<BaseMap>) => void
}) {
  if (baseMap.obstructions.length === 0) return null

  function update(id: string, patch: Partial<Obstruction>) {
    onBaseMap({
      obstructions: baseMap.obstructions.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })
  }
  function remove(id: string) {
    onBaseMap({ obstructions: baseMap.obstructions.filter((o) => o.id !== id) })
  }

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
        Traced obstructions
      </p>
      <ul className="space-y-2">
        {baseMap.obstructions.map((o, i) => (
          <li
            key={o.id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-[#2a1d10]/15 bg-[#fff6df]/70 px-3 py-2 text-sm"
          >
            <span className="font-medium capitalize text-[#2a1d10]">
              {o.kind} {i + 1}
            </span>
            {o.kind === 'building' && <BuildingHeightControl obstruction={o} onUpdate={(p) => update(o.id, p)} />}
            {o.kind === 'tree' && (
              <label className="flex items-center gap-1.5 text-[#2a1d10]/80">
                <input
                  type="checkbox"
                  checked={o.deciduous ?? false}
                  onChange={(e) => update(o.id, { deciduous: e.target.checked })}
                  className="accent-[#2a1d10]"
                />
                deciduous (drops leaves in winter)
              </label>
            )}
            <button
              type="button"
              onClick={() => remove(o.id)}
              className="ml-auto text-[#7a3b12] underline-offset-2 hover:underline"
            >
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BuildingHeightControl({
  obstruction,
  onUpdate,
}: {
  obstruction: Obstruction
  onUpdate: (patch: Partial<Obstruction>) => void
}) {
  const activeStory = heightFtToStory(obstruction.heightFt)
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {([1, 2] as StoryPreset[]).map((s) => (
        <Pill
          key={s}
          small
          active={activeStory === s}
          onClick={() => onUpdate({ heightFt: storyToHeightFt(s) })}
        >
          {s}-story
        </Pill>
      ))}
      <input
        type="number"
        min={0}
        value={obstruction.heightFt ?? ''}
        onChange={(e) => {
          const v = Number(e.target.value)
          onUpdate({ heightFt: Number.isFinite(v) ? v : undefined })
        }}
        className="w-16 rounded-md border border-[#2a1d10]/25 bg-white/70 px-2 py-1 text-sm"
        aria-label="Height in feet"
      />
      <span className="text-xs text-[#2a1d10]/55">ft</span>
    </span>
  )
}

// ── Small shared primitives ───────────────────────────────────────────────────

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

function NumberBox({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#2a1d10]/55">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-28 rounded-md border border-[#2a1d10]/25 bg-white/70 px-3 py-2 text-base text-[#2a1d10] placeholder:text-[#2a1d10]/40 focus:border-[#2a1d10]/60 focus:outline-none"
      />
    </label>
  )
}
