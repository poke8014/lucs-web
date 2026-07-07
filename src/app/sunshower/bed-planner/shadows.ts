// Sun/shade timelapse — unit H, module 2: shadow projection.
//
// Projects each obstruction's footprint (extruded to heightFt) into a ground
// shadow polygon set for a given season × time of day, in feet-space. Pure and
// unit-tested (shadows.test.ts). The renderable output feeds SunShadeLayer.
//
// Coordinate frames (see canvasMath / CanvasStage): feet-space is y-DOWN, and
// `northBearingDeg` is where compass-north sits clockwise-from-screen-up (the
// NorthArrow rotates its needle by exactly that). Sun azimuth is compass degrees
// clockwise from true north. We transform the sun's compass azimuth into a
// feet-space direction so shadows fall the right way regardless of map rotation.

import type { Obstruction, Point, Polygon } from './types'
import { sunPositionAt, type Season, type TimeOfDay } from './sun'

/** One obstruction's shadow, ready to render as a single filled SVG group. */
export interface ShadowPolygon {
  obstructionId: string
  /**
   * The footprint plus one quad per footprint edge (extruded along the shadow
   * direction). Rendered as ONE group with fillRule="nonzero" so the union reads
   * as a solid, non-convex-safe shadow region — no boolean union needed.
   */
  rings: Polygon[]
  /** The obstruction's own footprint, so the layer can darken it distinctly. */
  footprint: Polygon
  /**
   * 0–1 shade strength. Full for evergreens/buildings; the deciduous model
   * scales it down in fall and to 0 in winter (see `deciduousShadeFactor`).
   */
  opacity: number
}

/** Below this solar altitude (dawn/dusk) shadows are capped, not run to ∞. */
const MIN_ALTITUDE_DEG = 5
/**
 * Longest shadow we'll draw, in feet — the cap that replaces the tan→∞ blowup at
 * a near-horizon sun. Sized past the ~10,000 sq ft yard cap's diagonal so a real
 * low-sun shadow still crosses the whole plan, but the geometry stays finite.
 */
const MAX_SHADOW_LEN_FT = 300

const DEG = Math.PI / 180

/**
 * Full shadow-polygon set for every shadow-casting obstruction, at one
 * (season, timeOfDay). Obstructions with no usable height, or lit by a sun below
 * the horizon, or a deciduous tree in winter (factor 0), emit no shadow.
 *
 * @param northBearingDeg where compass-north sits, clockwise from screen-up
 *        (BaseMap.northBearingDeg; defaults to 0 = north-up).
 */
export function shadowPolygons(
  obstructions: Obstruction[],
  season: Season,
  timeOfDay: TimeOfDay,
  northBearingDeg = 0,
): ShadowPolygon[] {
  const sun = sunPositionAt(season, timeOfDay)
  if (sun.altitudeDeg <= 0) return [] // sun down — the whole plan is in shade

  // Shadow points away from the sun: shadow azimuth = sun azimuth + 180°.
  const shadowDir = azimuthToFeetDir(sun.azimuthDeg + 180, northBearingDeg)
  const length = shadowLengthFt(sun.altitudeDeg)

  const out: ShadowPolygon[] = []
  for (const ob of obstructions) {
    const h = ob.heightFt ?? 0
    if (h <= 0 || ob.footprint.length < 3) continue
    const opacity = shadeOpacity(ob, season)
    if (opacity <= 0) continue // deciduous tree in winter — no shade to draw

    // Shadow reach scales with the obstruction's height (length is per unit ft).
    const offset = { x: shadowDir.x * length * h, y: shadowDir.y * length * h }
    out.push({
      obstructionId: ob.id,
      footprint: ob.footprint,
      rings: extrudeFootprint(ob.footprint, offset),
      opacity,
    })
  }
  return out
}

/**
 * Shadow length PER FOOT of obstruction height: 1 / tan(altitude), capped near
 * the horizon. Multiply by heightFt for the real reach. A 45° sun → length 1
 * (shadow = height); lower sun → longer; the cap stops the tan→∞ blowup.
 */
export function shadowLengthFt(altitudeDeg: number): number {
  const alt = Math.max(altitudeDeg, MIN_ALTITUDE_DEG)
  const perFoot = 1 / Math.tan(alt * DEG)
  // Cap treats the per-foot length so even a 1-ft object can't run past the cap;
  // taller objects are additionally bounded by MAX_SHADOW_LEN_FT downstream via
  // the total (perFoot * height) — clamp here to keep the multiply finite.
  return Math.min(perFoot, MAX_SHADOW_LEN_FT)
}

/**
 * Convert a compass azimuth (degrees clockwise from true north) into a unit
 * direction vector in y-down feet-space, accounting for the map's north bearing.
 *
 * Screen-up is feet (0,−1) and equals compass-north when northBearingDeg = 0.
 * A compass bearing B is (northBearingDeg + B) clockwise from screen-up; in the
 * y-down plane a screen-clockwise rotation by θ is the matrix [cosθ,−sinθ;
 * sinθ,cosθ] applied to the up vector (0,−1). Worked through, that gives:
 *   x =  sin(θ),  y = −cos(θ)   with θ = northBearingDeg + B.
 */
export function azimuthToFeetDir(azimuthDeg: number, northBearingDeg: number): Point {
  const theta = (northBearingDeg + azimuthDeg) * DEG
  return { x: Math.sin(theta), y: -Math.cos(theta) }
}

/**
 * The non-convex-safe extrusion: the footprint itself, plus one quad per edge
 * swept along `offset`. Filled as one group with fillRule="nonzero", the union
 * is the swept shadow region — correct for concave footprints with no polygon
 * boolean op. Winding is consistent per quad ([v1, v2, v2+off, v1+off]).
 */
export function extrudeFootprint(footprint: Polygon, offset: Point): Polygon[] {
  const rings: Polygon[] = [footprint]
  for (let i = 0; i < footprint.length; i++) {
    const v1 = footprint[i]
    const v2 = footprint[(i + 1) % footprint.length]
    rings.push([
      { x: v1.x, y: v1.y },
      { x: v2.x, y: v2.y },
      { x: v2.x + offset.x, y: v2.y + offset.y },
      { x: v1.x + offset.x, y: v1.y + offset.y },
    ])
  }
  return rings
}

/**
 * The deciduous model (spec): a deciduous tree casts no shadow in winter (bare),
 * a half-strength shadow in fall (leaf drop underway), and full shade otherwise.
 * Everything non-deciduous (evergreens, buildings, fences) is always full.
 */
export function deciduousShadeFactor(deciduous: boolean | undefined, season: Season): number {
  if (!deciduous) return 1
  if (season === 'winter') return 0
  if (season === 'fall') return 0.5
  return 1
}

function shadeOpacity(ob: Obstruction, season: Season): number {
  // Only trees carry the deciduous flag; the factor is a no-op for everything
  // else, so buildings/fences stay at full strength year-round.
  return deciduousShadeFactor(ob.kind === 'tree' ? ob.deciduous : false, season)
}
