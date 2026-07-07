'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import {
  feetToScreen,
  fitViewport,
  gridStepFt,
  panBy,
  screenToFeet,
  zoomAt,
  type FeetPoint,
  type ScreenPoint,
  type Viewport,
} from './canvasMath'

// The shared editor stage. Owns the feet↔screen transform, pan (drag on empty
// space, or hold space + drag anywhere) and zoom (wheel / buttons), the ground
// grid, and the north arrow. Later units mount their own layers as children —
// they render inside the transformed group and read the transform (plus a
// screen→feet helper) from CanvasStageContext, so nothing re-derives the math.

/** A React mouse/pointer event on an SVG child — carries the owning <svg>. */
type SvgChildEvent = {
  clientX: number
  clientY: number
  currentTarget: Element
}

export interface StageApi {
  vp: Viewport
  /** feet-space → SVG screen px */
  toScreen: (p: FeetPoint) => ScreenPoint
  /**
   * Layer event → feet-space point. Reads the stage <svg> rect from the event's
   * own element (ownerSVGElement) at call time, so this helper closes over no
   * ref and stays render-safe when it rides on the context value.
   */
  eventToFeet: (e: SvgChildEvent) => FeetPoint
  /** true while the user is panning — layers should ignore clicks then */
  isPanning: boolean
}

/** Screen-px position of an event relative to the top-left of its owning SVG. */
function svgLocalPoint(e: SvgChildEvent): ScreenPoint {
  const el = e.currentTarget as SVGElement
  const svg = (el.ownerSVGElement ?? el) as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  return { sx: e.clientX - rect.left, sy: e.clientY - rect.top }
}

const CanvasStageContext = createContext<StageApi | null>(null)

/** Layers call this to read the live transform without prop-drilling. */
export function useStage(): StageApi {
  const ctx = useContext(CanvasStageContext)
  if (!ctx) throw new Error('useStage must be used inside <CanvasStage>')
  return ctx
}

const ZOOM_WHEEL_STEP = 1.0015 // per wheel-delta unit; gentle
const ZOOM_BUTTON_STEP = 1.3

export default function CanvasStage({
  widthFt,
  heightFt,
  northBearingDeg = 0,
  className,
  children,
  onBackgroundPointerDown,
}: {
  widthFt: number
  heightFt: number
  northBearingDeg?: number
  className?: string
  children?: ReactNode
  /**
   * Fires when a pointer-down lands on empty canvas (not a drag-to-pan). Layers
   * use this to add a vertex / start a trace. Feet-space point is provided.
   */
  onBackgroundPointerDown?: (p: FeetPoint, e: ReactPointerEvent) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [vp, setVp] = useState<Viewport | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)

  // A pan gesture in flight — tracked in a ref so pointer-move doesn't re-render
  // on every frame through React state churn.
  const panRef = useRef<{ lastX: number; lastY: number; moved: boolean } | null>(null)

  // Track the container size so the fit + resize logic has real pixels.
  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // First real size → frame the yard. We can't compute the initial viewport
  // until the container is measured (an external/DOM value), so this one-time
  // init-from-measurement genuinely belongs in an effect. The `prev ??` guard
  // makes it fire once; later resizes keep the user's pan/zoom untouched.
  useEffect(() => {
    if (size.w === 0 || size.h === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVp((prev) => prev ?? fitViewport(widthFt, heightFt, size.w, size.h))
  }, [size.w, size.h, widthFt, heightFt])

  // Space-to-pan: hold space anywhere to drag the canvas, like a design tool.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditableTarget(e.target)) {
        e.preventDefault()
        setSpaceHeld(true)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // The stage's own handlers fire on the <svg> itself, so they read the ref
  // directly (event handlers, not render — the ref rule is fine with this).
  const svgPoint = useCallback((e: { clientX: number; clientY: number }): ScreenPoint => {
    const rect = svgRef.current?.getBoundingClientRect()
    return { sx: e.clientX - (rect?.left ?? 0), sy: e.clientY - (rect?.top ?? 0) }
  }, [])

  // The context helper reads the SVG rect from the event, not the ref, so it can
  // ride on the memoized `api` value without tripping the "ref in render" rule.
  const eventToFeet = useCallback(
    (e: SvgChildEvent): FeetPoint => {
      if (!vp) return { x: 0, y: 0 }
      return screenToFeet(svgLocalPoint(e), vp)
    },
    [vp],
  )

  function handlePointerDown(e: ReactPointerEvent) {
    if (!vp) return
    const panMode = spaceHeld || e.button === 1 // space, or middle mouse
    // A left-click on empty canvas is either a pan-start (if it turns into a
    // drag) or a background tap the layers care about. We start tracking; the
    // pointer-up decides which it was.
    const p = svgPoint(e)
    panRef.current = { lastX: p.sx, lastY: p.sy, moved: false }
    if (panMode) {
      setIsPanning(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    // Left button on empty space: capture so a drag pans; a click (no move)
    // routes to the layer callback on pointer-up.
    if (e.button === 0) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  function handlePointerMove(e: ReactPointerEvent) {
    const pan = panRef.current
    if (!pan || !vp) return
    const p = svgPoint(e)
    const dx = p.sx - pan.lastX
    const dy = p.sy - pan.lastY
    if (!pan.moved && Math.hypot(dx, dy) > 3) {
      pan.moved = true
      setIsPanning(true) // a real drag on empty space pans, even without space held
    }
    if (pan.moved) {
      setVp((cur) => (cur ? panBy(cur, dx, dy) : cur))
      pan.lastX = p.sx
      pan.lastY = p.sy
    }
  }

  function handlePointerUp(e: ReactPointerEvent) {
    const pan = panRef.current
    panRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const wasPanning = isPanning
    setIsPanning(false)
    // A clean tap on empty canvas (no drag, not a pan) → let the layer act.
    if (pan && !pan.moved && !wasPanning && e.button === 0 && vp) {
      onBackgroundPointerDown?.(screenToFeet(svgPoint(e), vp), e)
    }
  }

  function handleWheel(e: ReactWheelEvent) {
    if (!vp) return
    e.preventDefault()
    const factor = Math.pow(ZOOM_WHEEL_STEP, -e.deltaY)
    setVp(zoomAt(vp, factor, svgPoint(e)))
  }

  function zoomButton(dir: 1 | -1) {
    if (!vp || size.w === 0) return
    const center = { sx: size.w / 2, sy: size.h / 2 }
    setVp(zoomAt(vp, dir === 1 ? ZOOM_BUTTON_STEP : 1 / ZOOM_BUTTON_STEP, center))
  }

  function resetView() {
    if (size.w === 0) return
    setVp(fitViewport(widthFt, heightFt, size.w, size.h))
  }

  // The transform + helpers layers read via context. Memoized so a layer only
  // re-renders when the viewport or pan-state actually changes. `eventToFeet`
  // dereferences the SVG ref lazily, at call time inside event handlers — never
  // during render — so this stays render-safe.
  const api = useMemo<StageApi | null>(
    () => (vp ? { vp, toScreen: (p) => feetToScreen(p, vp), eventToFeet, isPanning } : null),
    [vp, eventToFeet, isPanning],
  )

  const cursor = spaceHeld || isPanning ? 'grabbing' : 'crosshair'

  return (
    <div className={'relative overflow-hidden ' + (className ?? '')}>
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        style={{ cursor, background: '#f3e6c4' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        {api && vp && (
          <>
            <GridLayer vp={vp} viewW={size.w} viewH={size.h} />
            <CanvasStageContext.Provider value={api}>
              {/* Layers render in feet-space; the group applies the transform. */}
              <g>{children}</g>
            </CanvasStageContext.Provider>
          </>
        )}
      </svg>

      {/* North arrow — screen-fixed HUD, rotated to the plan's bearing. */}
      <NorthArrow bearingDeg={northBearingDeg} />

      {/* Zoom / reset controls — screen-fixed. */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <StageButton label="Zoom in" onClick={() => zoomButton(1)}>
          +
        </StageButton>
        <StageButton label="Zoom out" onClick={() => zoomButton(-1)}>
          −
        </StageButton>
        <StageButton label="Fit the whole yard" onClick={resetView}>
          ⤢
        </StageButton>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-[#2a1d10]/70 px-2 py-1 text-[11px] text-[#f7e9c9]">
        Drag to pan · scroll to zoom · space-drag to pan over a shape
      </p>
    </div>
  )
}

/** The ground grid: minor lines at gridStepFt, bold every 5th line. */
function GridLayer({ vp, viewW, viewH }: { vp: Viewport; viewW: number; viewH: number }) {
  const step = gridStepFt(vp.scale)
  // Feet-space bounds currently visible, snapped out to whole grid steps.
  const topLeft = screenToFeet({ sx: 0, sy: 0 }, vp)
  const botRight = screenToFeet({ sx: viewW, sy: viewH }, vp)
  const startX = Math.floor(topLeft.x / step) * step
  const endX = Math.ceil(botRight.x / step) * step
  const startY = Math.floor(topLeft.y / step) * step
  const endY = Math.ceil(botRight.y / step) * step

  const lines: ReactNode[] = []
  for (let x = startX; x <= endX; x += step) {
    const sx = feetToScreen({ x, y: 0 }, vp).sx
    const bold = Math.round(x / step) % 5 === 0
    lines.push(
      <line
        key={`vx${x}`}
        x1={sx}
        y1={0}
        x2={sx}
        y2={viewH}
        stroke="#2a1d10"
        strokeOpacity={bold ? 0.18 : 0.07}
        strokeWidth={1}
      />,
    )
  }
  for (let y = startY; y <= endY; y += step) {
    const sy = feetToScreen({ x: 0, y }, vp).sy
    const bold = Math.round(y / step) % 5 === 0
    lines.push(
      <line
        key={`hy${y}`}
        x1={0}
        y1={sy}
        x2={viewW}
        y2={sy}
        stroke="#2a1d10"
        strokeOpacity={bold ? 0.18 : 0.07}
        strokeWidth={1}
      />,
    )
  }
  return <g aria-hidden>{lines}</g>
}

function NorthArrow({ bearingDeg }: { bearingDeg: number }) {
  // The needle points toward compass-north; bearingDeg is where north sits
  // relative to "up," so we rotate the arrow by that amount.
  return (
    <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-center rounded-md bg-[#fff6df]/85 px-2 py-1.5 shadow-sm">
      <svg width={28} height={28} viewBox="0 0 28 28" style={{ transform: `rotate(${bearingDeg}deg)` }}>
        <polygon points="14,3 18,15 14,12 10,15" fill="#2a1d10" />
        <line x1="14" y1="12" x2="14" y2="25" stroke="#2a1d10" strokeWidth="1.5" strokeOpacity="0.5" />
      </svg>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#2a1d10]/70">
        N
      </span>
    </div>
  )
}

function StageButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/90 text-lg text-[#2a1d10] shadow-sm hover:bg-[#fff6df]"
    >
      {children}
    </button>
  )
}

/** Skip space-to-pan hijacking when the user is typing in a field. */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}
