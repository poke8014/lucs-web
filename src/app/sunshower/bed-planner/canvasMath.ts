// Pure canvas math for the bed-planner editor stage.
//
// Two coordinate spaces: **feet-space** (the GardenPlan's native units — the
// same y-down Point/Polygon space the contract lives in) and **screen-space**
// (SVG pixels). A Viewport is the affine link between them: uniform scale
// (screen px per foot) + a translation, so pan and zoom compose cleanly.
//
// Kept dependency-free and framework-free so it unit-tests as plain functions;
// CanvasStage owns the React state, this module owns the arithmetic.

export interface Viewport {
  scale: number // screen px per foot (zoom); always > 0
  tx: number // screen px offset of the feet-space origin, x
  ty: number // screen px offset of the feet-space origin, y
}

export interface ScreenPoint {
  sx: number
  sy: number
}

export interface FeetPoint {
  x: number
  y: number
}

/** feet → screen: sx = x·scale + tx (y-down in both spaces, so no flip). */
export function feetToScreen(p: FeetPoint, vp: Viewport): ScreenPoint {
  return { sx: p.x * vp.scale + vp.tx, sy: p.y * vp.scale + vp.ty }
}

/** screen → feet: the inverse of feetToScreen. */
export function screenToFeet(p: ScreenPoint, vp: Viewport): FeetPoint {
  return { x: (p.sx - vp.tx) / vp.scale, y: (p.sy - vp.ty) / vp.scale }
}

/** Pan by a screen-space delta (a drag). Feet-space is untouched. */
export function panBy(vp: Viewport, dxScreen: number, dyScreen: number): Viewport {
  return { ...vp, tx: vp.tx + dxScreen, ty: vp.ty + dyScreen }
}

/**
 * Zoom by `factor` while keeping the feet-point currently under `anchor`
 * (a screen point, e.g. the cursor) pinned there — the "zoom toward the mouse"
 * gesture. Solve for the translation that leaves the anchor's feet-point
 * mapping back to the same screen pixel at the new scale.
 */
export function zoomAt(vp: Viewport, factor: number, anchor: ScreenPoint): Viewport {
  const nextScale = clampScale(vp.scale * factor)
  const f = screenToFeet(anchor, vp) // the feet-point that must not move on screen
  return {
    scale: nextScale,
    tx: anchor.sx - f.x * nextScale,
    ty: anchor.sy - f.y * nextScale,
  }
}

// Zoom guard rails: below ~1 px/ft the grid is unreadable; above ~200 the yard
// is a single blade of grass. Sized for the ~10,000 sq ft yard cap.
export const MIN_SCALE = 1
export const MAX_SCALE = 200

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_SCALE
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/**
 * A viewport that fits a `widthFt × heightFt` extent inside a `viewW × viewH`
 * screen with a margin (fraction of the smaller screen dimension). The initial
 * "frame the whole yard" view; recomputed when the container resizes.
 */
export function fitViewport(
  widthFt: number,
  heightFt: number,
  viewW: number,
  viewH: number,
  marginFrac = 0.08,
): Viewport {
  const safeW = Math.max(1, widthFt)
  const safeH = Math.max(1, heightFt)
  const margin = Math.min(viewW, viewH) * marginFrac
  const usableW = Math.max(1, viewW - margin * 2)
  const usableH = Math.max(1, viewH - margin * 2)
  const scale = clampScale(Math.min(usableW / safeW, usableH / safeH))
  // Center the extent in the view.
  const tx = (viewW - safeW * scale) / 2
  const ty = (viewH - safeH * scale) / 2
  return { scale, tx, ty }
}

/**
 * Grid-line spacing in feet chosen so lines stay legible at the current scale:
 * step up 1 → 5 → 10 → 25 → 50 → 100 as we zoom out. `minPxGap` is the smallest
 * on-screen gap we tolerate between adjacent lines.
 */
export function gridStepFt(scale: number, minPxGap = 8): number {
  const steps = [1, 5, 10, 25, 50, 100]
  for (const step of steps) {
    if (step * scale >= minPxGap) return step
  }
  return steps[steps.length - 1]
}

/** Snap a feet value to the nearest `stepFt` — the light grid-snap on tracing. */
export function snapFt(value: number, stepFt: number): number {
  if (stepFt <= 0) return value
  return Math.round(value / stepFt) * stepFt
}
