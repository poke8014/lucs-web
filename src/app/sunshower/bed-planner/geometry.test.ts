import { describe, expect, it } from 'vitest'
import {
  distanceToPolygonEdge,
  pointInPolygon,
  polygonArea,
  polygonBounds,
  polygonCentroid,
} from './geometry'
import type { Polygon } from './types'

// A 4×3 axis-aligned rectangle (12 sq ft), corner at the origin, y-down.
const RECT: Polygon = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

// A right triangle with legs 6 and 4 → area 12.
const TRIANGLE: Polygon = [
  { x: 0, y: 0 },
  { x: 6, y: 0 },
  { x: 0, y: 4 },
]

// A concave "L" (a 4×4 square with a 2×2 bite out of the top-right).
// Area = 16 − 4 = 12. Vertices walk the outline counter-clockwise (y-down).
const L_SHAPE: Polygon = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 4 },
  { x: 0, y: 4 },
]

describe('polygonArea (shoelace, absolute)', () => {
  it('computes a rectangle area', () => {
    expect(polygonArea(RECT)).toBe(12)
  })

  it('computes a triangle area', () => {
    expect(polygonArea(TRIANGLE)).toBe(12)
  })

  it('handles a concave polygon', () => {
    expect(polygonArea(L_SHAPE)).toBe(12)
  })

  it('is winding-order independent (reversed ring same area)', () => {
    expect(polygonArea([...RECT].reverse())).toBe(12)
  })

  it('returns 0 for degenerate polygons', () => {
    expect(polygonArea([])).toBe(0)
    expect(polygonArea([{ x: 1, y: 1 }])).toBe(0)
    expect(polygonArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0)
  })
})

describe('pointInPolygon (ray cast)', () => {
  it('detects an interior point of a rectangle', () => {
    expect(pointInPolygon({ x: 2, y: 1.5 }, RECT)).toBe(true)
  })

  it('rejects a point outside a rectangle', () => {
    expect(pointInPolygon({ x: 5, y: 1.5 }, RECT)).toBe(false)
    expect(pointInPolygon({ x: -1, y: 1 }, RECT)).toBe(false)
  })

  it('handles the concave notch — a point in the bite is outside', () => {
    // (3, 3) sits in the removed top-right 2×2 quadrant of the L.
    expect(pointInPolygon({ x: 3, y: 3 }, L_SHAPE)).toBe(false)
    // (1, 3) is in the remaining left arm — inside.
    expect(pointInPolygon({ x: 1, y: 3 }, L_SHAPE)).toBe(true)
    // (1, 1) is in the shared base square — inside.
    expect(pointInPolygon({ x: 1, y: 1 }, L_SHAPE)).toBe(true)
  })

  it('returns false for degenerate polygons', () => {
    expect(pointInPolygon({ x: 0, y: 0 }, [])).toBe(false)
    expect(pointInPolygon({ x: 0, y: 0 }, [{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(false)
  })
})

describe('distanceToPolygonEdge (nearest point-to-segment)', () => {
  it('measures to the nearest edge from inside', () => {
    // (1, 1.5) → nearest edge is the left wall (x = 0), distance 1.
    expect(distanceToPolygonEdge({ x: 1, y: 1.5 }, RECT)).toBe(1)
  })

  it('measures to the nearest edge from outside', () => {
    // (6, 1.5) → nearest edge is the right wall (x = 4), distance 2.
    expect(distanceToPolygonEdge({ x: 6, y: 1.5 }, RECT)).toBe(2)
  })

  it('clamps to a segment endpoint when the foot of the perpendicular is off-segment', () => {
    // (7, 0) is beyond the right end of the bottom edge; nearest is corner (4,0).
    expect(distanceToPolygonEdge({ x: 7, y: 0 }, RECT)).toBe(3)
  })

  it('measures into a concave polygon across the nearest inner edge', () => {
    // (3, 3) sits in the removed top-right bite. The nearest edge is the
    // vertical inner wall x = 2 (segment (2,2)→(2,4)); its foot at (2,3) is on
    // the segment, so the distance is a clean 1.
    expect(distanceToPolygonEdge({ x: 3, y: 3 }, L_SHAPE)).toBeCloseTo(1, 10)
  })

  it('clamps to a corner of a concave polygon when off every edge', () => {
    // (7, 0) is beyond the right end of the L's bottom edge; the nearest edge
    // point is the corner (4, 0), distance 3.
    expect(distanceToPolygonEdge({ x: 7, y: 0 }, L_SHAPE)).toBeCloseTo(3, 10)
  })

  it('returns Infinity for a sub-2-vertex polygon', () => {
    expect(distanceToPolygonEdge({ x: 0, y: 0 }, [])).toBe(Infinity)
    expect(distanceToPolygonEdge({ x: 0, y: 0 }, [{ x: 1, y: 1 }])).toBe(Infinity)
  })
})

describe('polygonBounds', () => {
  it('bounds a rectangle', () => {
    expect(polygonBounds(RECT)).toEqual({ minX: 0, minY: 0, maxX: 4, maxY: 3 })
  })

  it('bounds a concave polygon by its extremes', () => {
    expect(polygonBounds(L_SHAPE)).toEqual({ minX: 0, minY: 0, maxX: 4, maxY: 4 })
  })

  it('zeroes an empty polygon', () => {
    expect(polygonBounds([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })
})

describe('polygonCentroid (area-weighted)', () => {
  it('centers a rectangle', () => {
    expect(polygonCentroid(RECT)).toEqual({ x: 2, y: 1.5 })
  })

  it('centers a triangle at the average of its vertices', () => {
    // A triangle's area centroid is exactly the vertex mean: (2, 4/3).
    const c = polygonCentroid(TRIANGLE)
    expect(c.x).toBeCloseTo(2, 10)
    expect(c.y).toBeCloseTo(4 / 3, 10)
  })

  it('pulls the centroid into the mass for a concave polygon', () => {
    // By symmetry about the y = x diagonal the L's centroid lies on it, and it
    // sits toward the origin, away from the removed corner (< 2 on both axes).
    const c = polygonCentroid(L_SHAPE)
    expect(c.x).toBeCloseTo(c.y, 10)
    expect(c.x).toBeLessThan(2)
    expect(c.x).toBeGreaterThan(0)
  })

  it('falls back to the vertex average for a zero-area polygon', () => {
    const collinear: Polygon = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
    ]
    expect(polygonCentroid(collinear)).toEqual({ x: 2, y: 0 })
  })

  it('handles trivial polygons', () => {
    expect(polygonCentroid([])).toEqual({ x: 0, y: 0 })
    expect(polygonCentroid([{ x: 3, y: 5 }])).toEqual({ x: 3, y: 5 })
  })
})
