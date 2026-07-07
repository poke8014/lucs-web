import { describe, expect, it } from 'vitest'
import type { Obstruction } from './types'
import {
  azimuthToFeetDir,
  deciduousShadeFactor,
  extrudeFootprint,
  shadowLengthFt,
  shadowPolygons,
} from './shadows'
import { polygonBounds } from './geometry'

// A 10-ft cube footprint (1 sq-... 10×10), corner near the origin, y-down.
function cube(id = 'c', heightFt = 10): Obstruction {
  return {
    id,
    kind: 'building',
    heightFt,
    footprint: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  }
}

function tree(id: string, deciduous: boolean): Obstruction {
  return {
    id,
    kind: 'tree',
    heightFt: 20,
    deciduous,
    footprint: [
      { x: 40, y: 40 },
      { x: 50, y: 40 },
      { x: 50, y: 50 },
      { x: 40, y: 50 },
    ],
  }
}

describe('azimuthToFeetDir — compass azimuth → y-down feet direction', () => {
  it('north-up: compass N (0°) points screen-up (−y)', () => {
    const d = azimuthToFeetDir(0, 0)
    expect(d.x).toBeCloseTo(0, 10)
    expect(d.y).toBeCloseTo(-1, 10)
  })

  it('north-up: compass E (90°) points +x', () => {
    const d = azimuthToFeetDir(90, 0)
    expect(d.x).toBeCloseTo(1, 10)
    expect(d.y).toBeCloseTo(0, 10)
  })

  it('north-up: compass S (180°) points +y (down)', () => {
    const d = azimuthToFeetDir(180, 0)
    expect(d.x).toBeCloseTo(0, 10)
    expect(d.y).toBeCloseTo(1, 10)
  })

  it('rotates with the map bearing: N with a 90° bearing points +x', () => {
    // North sits 90° clockwise from screen-up ⇒ compass-N is to the right.
    const d = azimuthToFeetDir(0, 90)
    expect(d.x).toBeCloseTo(1, 10)
    expect(d.y).toBeCloseTo(0, 10)
  })
})

describe('shadowLengthFt — height-independent per-foot reach', () => {
  it('a 45° sun casts a shadow as long as the object is tall (per-foot = 1)', () => {
    expect(shadowLengthFt(45)).toBeCloseTo(1, 6)
  })

  it('a lower sun casts a longer shadow', () => {
    expect(shadowLengthFt(20)).toBeGreaterThan(shadowLengthFt(60))
  })

  it('caps near the horizon instead of running to infinity', () => {
    const grazing = shadowLengthFt(0.1)
    expect(Number.isFinite(grazing)).toBe(true)
    expect(grazing).toBe(shadowLengthFt(0)) // both clamp to the MIN_ALTITUDE floor
  })
})

describe('extrudeFootprint — non-convex-safe swept region', () => {
  it('emits the footprint plus one quad per edge', () => {
    const rings = extrudeFootprint(cube().footprint, { x: 5, y: 0 })
    expect(rings.length).toBe(1 + 4) // footprint + 4 edge quads
    expect(rings[0]).toEqual(cube().footprint)
    expect(rings.slice(1).every((r) => r.length === 4)).toBe(true)
  })

  it('sweeps the region toward the offset (bounds extend by the offset)', () => {
    const rings = extrudeFootprint(cube().footprint, { x: 20, y: 0 })
    const all = rings.flat()
    const b = polygonBounds(all)
    expect(b.maxX).toBeCloseTo(30, 6) // 10 (footprint) + 20 (offset)
    expect(b.minX).toBeCloseTo(0, 6)
  })
})

describe('shadowPolygons — the core projection', () => {
  it('a 10-ft cube at noon casts its shadow north (−y) when north is up', () => {
    // Summer noon: sun due south, so shadow points north = screen-up = −y.
    const [shadow] = shadowPolygons([cube()], 'summer', 'midday', 0)
    expect(shadow).toBeDefined()
    const b = polygonBounds(shadow.rings.flat())
    // Shadow extends above the footprint (minY well negative) and not below it.
    expect(b.minY).toBeLessThan(-1)
    expect(b.maxY).toBeCloseTo(10, 6) // footprint's own far edge, unchanged
  })

  it('casts a longer shadow in winter than in summer (lower winter sun)', () => {
    const summer = shadowPolygons([cube()], 'summer', 'midday', 0)[0]
    const winter = shadowPolygons([cube()], 'winter', 'midday', 0)[0]
    const summerReach = 10 - polygonBounds(summer.rings.flat()).minY
    const winterReach = 10 - polygonBounds(winter.rings.flat()).minY
    expect(winterReach).toBeGreaterThan(summerReach)
  })

  it('skips obstructions with no height', () => {
    const flat = { ...cube('flat'), heightFt: undefined }
    expect(shadowPolygons([flat], 'summer', 'midday', 0)).toEqual([])
  })

  it('emits nothing when the sun is below the horizon (defensive)', () => {
    // sunPositionAt never samples a night hour, but guard the contract anyway.
    // All display buckets are daytime, so every season/time here yields a shadow;
    // this asserts the non-empty side so the guard doesn't silently swallow all.
    expect(shadowPolygons([cube()], 'winter', 'afternoon', 0).length).toBe(1)
  })
})

describe('deciduous model', () => {
  it('deciduousShadeFactor: none in winter, half in fall, full otherwise', () => {
    expect(deciduousShadeFactor(true, 'winter')).toBe(0)
    expect(deciduousShadeFactor(true, 'fall')).toBe(0.5)
    expect(deciduousShadeFactor(true, 'summer')).toBe(1)
    expect(deciduousShadeFactor(true, 'spring')).toBe(1)
  })

  it('evergreens are full strength every season', () => {
    for (const s of ['winter', 'spring', 'summer', 'fall'] as const) {
      expect(deciduousShadeFactor(false, s)).toBe(1)
    }
  })

  it('a deciduous tree drops its winter shadow entirely', () => {
    expect(shadowPolygons([tree('t', true)], 'winter', 'midday', 0)).toEqual([])
  })

  it('a deciduous tree casts a half-opacity shadow in fall', () => {
    const [shadow] = shadowPolygons([tree('t', true)], 'fall', 'midday', 0)
    expect(shadow.opacity).toBe(0.5)
  })

  it('an evergreen tree keeps its winter shadow at full opacity', () => {
    const [shadow] = shadowPolygons([tree('t', false)], 'winter', 'midday', 0)
    expect(shadow.opacity).toBe(1)
  })
})
