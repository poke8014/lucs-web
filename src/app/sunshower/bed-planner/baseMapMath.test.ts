import { describe, expect, it } from 'vitest'
import {
  boundingBox,
  heightFtToStory,
  latLngRingToFeet,
  lineLengthPx,
  northBearingFromAspect,
  pxPerFtFromCalibration,
  rectangleBoundary,
  storyToHeightFt,
  translateToOrigin,
} from './baseMapMath'

describe('scale calibration', () => {
  it('measures a line length in pixels', () => {
    expect(lineLengthPx({ sx: 0, sy: 0 }, { sx: 3, sy: 4 })).toBe(5)
  })

  it('derives px-per-foot from a line and its known length', () => {
    // a 200px line drawn over a 10ft fence panel → 20 px/ft
    expect(pxPerFtFromCalibration(200, 10)).toBe(20)
  })

  it('rejects degenerate calibration input', () => {
    expect(pxPerFtFromCalibration(0, 10)).toBeNull()
    expect(pxPerFtFromCalibration(200, 0)).toBeNull()
    expect(pxPerFtFromCalibration(200, -5)).toBeNull()
    expect(pxPerFtFromCalibration(NaN, 10)).toBeNull()
  })
})

describe('story presets', () => {
  it('maps stories to rough foot heights', () => {
    expect(storyToHeightFt(1)).toBe(12)
    expect(storyToHeightFt(2)).toBe(22)
  })

  it('reverse-maps exact preset heights, nothing else', () => {
    expect(heightFtToStory(12)).toBe(1)
    expect(heightFtToStory(22)).toBe(2)
    expect(heightFtToStory(15)).toBeNull() // free override — no preset echo
    expect(heightFtToStory(undefined)).toBeNull()
  })
})

describe('northBearingFromAspect', () => {
  it('seeds north opposite the facing direction', () => {
    // facing south (looking out to the south) → north is up → 0°
    expect(northBearingFromAspect('S')).toBe(0)
    expect(northBearingFromAspect('N')).toBe(180)
    expect(northBearingFromAspect('E')).toBe(270)
    expect(northBearingFromAspect('W')).toBe(90)
  })

  it('defaults to 0 when aspect is unknown', () => {
    expect(northBearingFromAspect(undefined)).toBe(0)
  })
})

describe('rectangleBoundary', () => {
  it('builds a closed feet-space rectangle from the origin', () => {
    expect(rectangleBoundary(30, 20)).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 20 },
      { x: 0, y: 20 },
    ])
  })

  it('clamps negative dimensions to zero', () => {
    expect(rectangleBoundary(-5, 10)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 0, y: 10 },
    ])
  })
})

describe('latLngRingToFeet', () => {
  const origin = { lat: 37.3, lng: -121.9 } // South Bay-ish

  it('is empty for an empty ring', () => {
    expect(latLngRingToFeet([], origin)).toEqual([])
  })

  it('converts a small ring to feet with north up-screen (y-down)', () => {
    // one degree north of origin should map to a large negative y before the
    // translate-to-origin shift; check the shape is right by feet extent.
    const ring = [
      { lat: 37.3, lng: -121.9 },
      { lat: 37.3, lng: -121.8999 },
      { lat: 37.3001, lng: -121.8999 },
      { lat: 37.3001, lng: -121.9 },
    ]
    const feet = latLngRingToFeet(ring, origin)
    expect(feet).toHaveLength(4)
    const { widthFt, heightFt } = boundingBox(feet)
    // 0.0001° lat ≈ 36.4 ft; 0.0001° lng at 37.3° ≈ 36.4*cos(37.3) ≈ 28.9 ft
    expect(heightFt).toBeCloseTo(36.4, 0)
    expect(widthFt).toBeCloseTo(28.9, 0)
  })

  it('anchors the result at the origin (min corner at 0,0)', () => {
    const ring = [
      { lat: 37.3, lng: -121.9 },
      { lat: 37.3002, lng: -121.8998 },
    ]
    const feet = latLngRingToFeet(ring, origin)
    const minX = Math.min(...feet.map((p) => p.x))
    const minY = Math.min(...feet.map((p) => p.y))
    expect(minX).toBeCloseTo(0)
    expect(minY).toBeCloseTo(0)
  })
})

describe('translateToOrigin & boundingBox', () => {
  it('shifts a polygon so its top-left corner is (0,0)', () => {
    const shifted = translateToOrigin([
      { x: 5, y: 8 },
      { x: 15, y: 8 },
      { x: 15, y: 20 },
    ])
    expect(shifted[0]).toEqual({ x: 0, y: 0 })
    expect(boundingBox(shifted)).toEqual({ widthFt: 10, heightFt: 12 })
  })

  it('returns a zero box for an empty polygon', () => {
    expect(boundingBox([])).toEqual({ widthFt: 0, heightFt: 0 })
  })
})
