// Shared accessors + small geometry the checker rules read off. Pure, no React.
//
// Kept separate from the rules so each rule stays a short, testable predicate
// over already-resolved data (a plant's seasons, a section's viewing edge…)
// rather than re-deriving plant/geometry lookups inline.

import type {
  GardenPlan,
  Placement,
  Point,
  Polygon,
  Section,
} from '../types'
import type { SelectorPlant } from '../../plant-selector/types'
import type { SunTier } from '../../site-inventory/types'
import { sunTokens } from '../../plant-selector/corpus'
import { polygonBounds } from '../geometry'

// ── Plant corpus lookup ───────────────────────────────────────────────────────

/** slug → plant, built once per run so a rule can resolve species cheaply. */
export function plantIndex(corpus: SelectorPlant[]): Map<string, SelectorPlant> {
  const idx = new Map<string, SelectorPlant>()
  for (const p of corpus) idx.set(p.slug, p)
  return idx
}

/** Every distinct plant slug a placement introduces (drift/individual = 1,
 *  matrixFill = every species in its mix). */
export function placementSlugs(placement: Placement): string[] {
  if (placement.kind === 'matrixFill') {
    return placement.mix.map((m) => m.plantSlug)
  }
  return [placement.plantSlug]
}

// ── Bloom seasons ─────────────────────────────────────────────────────────────

export const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const
export type BloomSeason = (typeof SEASONS)[number]

/** The bloom seasons a placement contributes, unioned across its species. */
export function placementBloomSeasons(
  placement: Placement,
  index: Map<string, SelectorPlant>,
): Set<BloomSeason> {
  const out = new Set<BloomSeason>()
  for (const slug of placementSlugs(placement)) {
    const plant = index.get(slug)
    for (const s of plant?.bloom_season ?? []) {
      if ((SEASONS as readonly string[]).includes(s)) out.add(s as BloomSeason)
    }
  }
  return out
}

// ── Mature size ───────────────────────────────────────────────────────────────

/** Max mature height in ft, or null when the corpus carries no size data. */
export function matureHeightFt(plant: SelectorPlant | undefined): number | null {
  return plant?.height_ft_range?.max ?? null
}

/** Max mature width in ft, or null when the corpus carries no size data. */
export function matureWidthFt(plant: SelectorPlant | undefined): number | null {
  return plant?.width_ft_range?.max ?? null
}

/** A placement's representative point for spatial reasoning:
 *  individual → its center; drift/matrixFill → the polygon centroid-ish
 *  (bounding-box center, good enough for edge-proximity + inversion axes). */
export function placementAnchorPoint(placement: Placement): Point | null {
  if (placement.kind === 'individual') return placement.center
  if (placement.kind === 'drift') return boundsCenter(placement.area)
  return null // matrixFill has no single point — it's a region
}

function boundsCenter(polygon: Polygon): Point {
  const b = polygonBounds(polygon)
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
}

// ── Sun / water compatibility (rule 9) ────────────────────────────────────────
// The section carries a 5-tier SunTier label; the plant carries a Calscape
// sun_range ("Full Sun, Partial Shade…"). We reuse the same tier↔token matrix
// the selector's fit.ts documents, but read it locally so the checker doesn't
// depend on fit.ts internals (fit.ts's sunFit isn't exported). "Excludes" here
// means the plant has *no* tolerance for the labeled light — a soft flag, since
// the palette already filters this up front and plant-first entry can bypass it.

type SunToken = ReturnType<typeof sunTokens>[number]

/**
 * Does a plant's sun tolerance exclude the section's stated sun tier? Returns
 * false (no conflict) when we lack data on either side — the checker never fires
 * on absence, only on a real mismatch.
 */
export function sunExcludes(tier: SunTier | undefined, plant: SelectorPlant): boolean {
  if (!tier) return false
  const tokens = sunTokens(plant.native?.sun_range)
  if (tokens.length === 0) return false // unknown tolerance → no finding
  const full = tokens.includes('full_sun')
  const part = tokens.includes('partial_shade')
  const deep = tokens.includes('deep_shade')

  switch (tier) {
    case 'full_sun':
      // Deep-shade-only plants scorch in blazing sun.
      return !full && !part && deep
    case 'morning_sun_afternoon_shade':
      // Gentle part-sun — almost anything copes; only a deep-shade-only plant
      // that also can't take part-shade is a real miss (rare, but honest).
      return !full && !part && deep
    case 'morning_shade_afternoon_sun':
      // Harshest light — needs full-sun tolerance. Shade-only plants struggle.
      return !full
    case 'dappled_shade':
      // Shade bed — a full-sun-only plant stretches here.
      return full && !part && !deep
    case 'full_shade':
      // Deep shade — a full-sun-only plant won't take it.
      return full && !part && !deep
  }
}

const WATER_ORDER: Record<string, number> = {
  'extremely low': 0,
  'very low': 1,
  low: 2,
  moderate: 3,
  high: 4,
}

function waterLevels(plant: SelectorPlant): number[] {
  const raw = plant.native?.water_range
  if (!raw) return []
  const out: number[] = []
  for (const part of raw.split(',')) {
    const level = WATER_ORDER[part.trim().toLowerCase()]
    if (level != null) out.push(level)
  }
  return out
}

/**
 * Does a plant's water range exclude the section's moisture label? We collapse
 * the section's 3-way moisture (dry/average/wet) onto the Calscape water scale
 * and fire only when the plant sits clearly on the wrong side (a dry-only plant
 * in a wet bed, or a high-water plant in a dry bed). Soft: a plant whose range
 * *includes* the label is never flagged, and unknown data never fires.
 */
export function waterExcludes(
  moisture: 'dry' | 'average' | 'wet' | undefined,
  plant: SelectorPlant,
): boolean {
  if (!moisture) return false
  const levels = waterLevels(plant)
  if (levels.length === 0) return false
  const min = Math.min(...levels)
  const max = Math.max(...levels)

  if (moisture === 'dry') {
    // Dry bed: a plant that needs at least Moderate water (min ≥ Moderate) is a miss.
    return min >= WATER_ORDER['moderate']
  }
  if (moisture === 'wet') {
    // Wet bed: a plant that tops out at Low or drier (max ≤ Low) will sulk.
    return max <= WATER_ORDER['low']
  }
  // 'average' — the forgiving middle; don't fire.
  return false
}

// ── Viewing edge (rule 3: height inversion) ───────────────────────────────────
// The "primary viewing edge" is where a person stands to look at the bed. We
// derive it as the section polygon edge nearest to any path polyline; failing a
// path, the section edge nearest a `building` obstruction (you view a
// foundation bed from the house/yard side); failing both, the longest edge
// (beds are usually viewed broadside). This is a documented approximation — the
// data has no explicit "front" — and the rule only fires on *big* inversions so
// the approximation's noise stays invisible. See rule 3 for the fire threshold.

export interface Segment {
  a: Point
  b: Point
}

/** The polygon's edges as segments (closed ring). */
export function polygonEdges(polygon: Polygon): Segment[] {
  const edges: Segment[] = []
  for (let i = 0; i < polygon.length; i++) {
    edges.push({ a: polygon[i], b: polygon[(i + 1) % polygon.length] })
  }
  return edges
}

/** Midpoint of a segment. */
export function segmentMidpoint(seg: Segment): Point {
  return { x: (seg.a.x + seg.b.x) / 2, y: (seg.a.y + seg.b.y) / 2 }
}

export function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Every segment of every path polyline in the plan. */
export function pathSegments(plan: GardenPlan): Segment[] {
  const segs: Segment[] = []
  for (const path of plan.paths) {
    const pts = path.polyline
    for (let i = 0; i + 1 < pts.length; i++) {
      segs.push({ a: pts[i], b: pts[i + 1] })
    }
  }
  return segs
}

/** Segments of every `building` obstruction footprint. */
export function buildingSegments(plan: GardenPlan): Segment[] {
  const segs: Segment[] = []
  for (const o of plan.baseMap.obstructions) {
    if (o.kind === 'building') segs.push(...polygonEdges(o.footprint))
  }
  return segs
}

export type ViewingEdgeSource = 'path' | 'building' | 'longest'

export interface ViewingEdge {
  edge: Segment
  source: ViewingEdgeSource
}

/**
 * The section's primary viewing edge (documented approximation above). Returns
 * null for a degenerate section (fewer than 3 vertices).
 */
export function viewingEdge(section: Section, plan: GardenPlan): ViewingEdge | null {
  const edges = polygonEdges(section.polygon)
  if (edges.length < 3) return null

  const paths = pathSegments(plan)
  if (paths.length > 0) {
    const edge = nearestEdge(edges, paths)
    if (edge) return { edge, source: 'path' }
  }
  const buildings = buildingSegments(plan)
  if (buildings.length > 0) {
    const edge = nearestEdge(edges, buildings)
    if (edge) return { edge, source: 'building' }
  }
  return { edge: longestEdge(edges), source: 'longest' }
}

// Score edges by their *midpoint* distance to the nearest reference segment,
// not by closest-approach. Two adjacent polygon edges share a corner, so a
// perpendicular edge ties a parallel one on closest-approach; the midpoint test
// correctly prefers the edge that actually runs alongside the path/wall (the one
// you'd view the bed from).
function nearestEdge(edges: Segment[], reference: Segment[]): Segment | null {
  let best: Segment | null = null
  let bestDist = Infinity
  for (const edge of edges) {
    const mid = segmentMidpoint(edge)
    let d = Infinity
    for (const ref of reference) {
      const dd = pointToSegment(mid, ref.a, ref.b)
      if (dd < d) d = dd
    }
    if (d < bestDist) {
      bestDist = d
      best = edge
    }
  }
  return best
}

function longestEdge(edges: Segment[]): Segment {
  let best = edges[0]
  let bestLen = -Infinity
  for (const e of edges) {
    const len = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y)
    if (len > bestLen) {
      bestLen = len
      best = e
    }
  }
  return best
}

/**
 * Signed depth of a point away from the viewing edge, along the edge's inward
 * normal. Larger = further back in the bed as seen from the viewer. Used to
 * order placements front→back for the height-inversion check.
 */
export function depthFromEdge(point: Point, edge: Segment, interior: Point): number {
  const dx = edge.b.x - edge.a.x
  const dy = edge.b.y - edge.a.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return 0
  // Left-normal of the edge direction.
  let nx = -dy / len
  let ny = dx / len
  // Orient the normal to point into the section interior.
  const toInteriorX = interior.x - edge.a.x
  const toInteriorY = interior.y - edge.a.y
  if (nx * toInteriorX + ny * toInteriorY < 0) {
    nx = -nx
    ny = -ny
  }
  return (point.x - edge.a.x) * nx + (point.y - edge.a.y) * ny
}
