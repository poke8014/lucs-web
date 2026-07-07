// Pure feet-space geometry utilities the later planner units build on
// (section area/quantity math, hit-testing, unreachable-depth checks). All
// functions treat a Polygon as an implicitly-closed ring of Points — the last
// vertex connects back to the first; callers don't repeat the first point.

import type { Point, Polygon } from './types'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Signed-area magnitude of a polygon via the shoelace formula (absolute value,
 * so winding order doesn't matter). Feet in → square feet out. A polygon with
 * fewer than 3 vertices encloses no area and returns 0.
 */
export function polygonArea(polygon: Polygon): number {
  if (polygon.length < 3) return 0
  let twiceArea = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    twiceArea += a.x * b.y - b.x * a.y
  }
  return Math.abs(twiceArea) / 2
}

/**
 * Ray-casting point-in-polygon test. Counts edge crossings of a ray shot in the
 * +x direction; odd crossings ⇒ inside. Works for convex and concave polygons.
 * Points exactly on an edge are not guaranteed to test as inside — hit-testing
 * for the UI tolerates that; `distanceToPolygonEdge` covers the near-edge case.
 */
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    // Does the horizontal ray at point.y cross edge a–b, and is the crossing to
    // the right of point.x? XOR toggles `inside` on each valid crossing.
    const straddlesY = a.y > point.y !== b.y > point.y
    if (!straddlesY) continue
    const crossingX = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (point.x < crossingX) inside = !inside
  }
  return inside
}

/**
 * Shortest distance from a point to the perimeter of a polygon — the minimum
 * point-to-segment distance across every edge (including the closing edge).
 * Used by the "unreachable depth" checker (how far into a bed you can reach).
 * Returns Infinity for a degenerate polygon (fewer than 2 vertices).
 */
export function distanceToPolygonEdge(point: Point, polygon: Polygon): number {
  if (polygon.length < 2) return Infinity
  let min = Infinity
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const d = distanceToSegment(point, a, b)
    if (d < min) min = d
  }
  return min
}

/** Axis-aligned bounding box. Empty polygon ⇒ a zeroed box at the origin. */
export function polygonBounds(polygon: Polygon): Bounds {
  if (polygon.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of polygon) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Area-weighted centroid via the signed-area formula — the true geometric
 * center, correct for concave shapes (not the naive vertex average). Falls back
 * to the vertex average when the polygon is degenerate (zero area), and to the
 * lone point / origin for 1- and 0-vertex inputs.
 */
export function polygonCentroid(polygon: Polygon): Point {
  if (polygon.length === 0) return { x: 0, y: 0 }
  if (polygon.length === 1) return { x: polygon[0].x, y: polygon[0].y }

  let twiceArea = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const cross = a.x * b.y - b.x * a.y
    twiceArea += cross
    cx += (a.x + b.x) * cross
    cy += (a.y + b.y) * cross
  }

  if (twiceArea === 0) return vertexAverage(polygon)
  const sixArea = 3 * twiceArea
  return { x: cx / sixArea, y: cy / sixArea }
}

// ---- internals ------------------------------------------------------------

/** Shortest distance from a point to a single line segment a–b. */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y) // a and b coincide
  // Project p onto the infinite line, clamp the parameter to the segment.
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = a.x + t * dx
  const projY = a.y + t * dy
  return Math.hypot(p.x - projX, p.y - projY)
}

function vertexAverage(polygon: Polygon): Point {
  let x = 0
  let y = 0
  for (const p of polygon) {
    x += p.x
    y += p.y
  }
  return { x: x / polygon.length, y: y / polygon.length }
}
