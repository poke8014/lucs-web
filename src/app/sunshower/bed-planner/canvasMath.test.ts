import { describe, expect, it } from 'vitest'
import {
  clampScale,
  feetToScreen,
  fitViewport,
  gridStepFt,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  screenToFeet,
  snapFt,
  zoomAt,
  type Viewport,
} from './canvasMath'

const VP: Viewport = { scale: 10, tx: 100, ty: 50 }

describe('feetToScreen / screenToFeet', () => {
  it('applies scale then translation', () => {
    expect(feetToScreen({ x: 2, y: 3 }, VP)).toEqual({ sx: 120, sy: 80 })
  })

  it('round-trips through the inverse', () => {
    const f = { x: 7.25, y: -4.5 }
    const s = feetToScreen(f, VP)
    const back = screenToFeet(s, VP)
    expect(back.x).toBeCloseTo(f.x)
    expect(back.y).toBeCloseTo(f.y)
  })
})

describe('panBy', () => {
  it('shifts translation, leaves scale', () => {
    const next = panBy(VP, 15, -5)
    expect(next).toEqual({ scale: 10, tx: 115, ty: 45 })
  })
})

describe('zoomAt', () => {
  it('keeps the feet-point under the anchor pinned on screen', () => {
    const anchor = { sx: 300, sy: 200 }
    const before = screenToFeet(anchor, VP)
    const next = zoomAt(VP, 1.5, anchor)
    const after = feetToScreen(before, next)
    expect(after.sx).toBeCloseTo(anchor.sx)
    expect(after.sy).toBeCloseTo(anchor.sy)
    expect(next.scale).toBeCloseTo(15)
  })

  it('respects the scale ceiling while still pinning the anchor', () => {
    const anchor = { sx: 300, sy: 200 }
    const hot: Viewport = { scale: MAX_SCALE, tx: 0, ty: 0 }
    const before = screenToFeet(anchor, hot)
    const next = zoomAt(hot, 4, anchor)
    expect(next.scale).toBe(MAX_SCALE)
    const after = feetToScreen(before, next)
    expect(after.sx).toBeCloseTo(anchor.sx)
  })
})

describe('clampScale', () => {
  it('clamps to the min/max range', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE)
    expect(clampScale(9999)).toBe(MAX_SCALE)
    expect(clampScale(42)).toBe(42)
  })

  it('falls back to the safe floor for non-finite input', () => {
    // Any non-finite value is bad state — snap to the min rather than the max.
    expect(clampScale(NaN)).toBe(MIN_SCALE)
    expect(clampScale(Infinity)).toBe(MIN_SCALE)
  })
})

describe('fitViewport', () => {
  it('frames the whole extent and centers it', () => {
    const vp = fitViewport(50, 25, 800, 600, 0)
    // width-bound: 800/50 = 16, height-bound: 600/25 = 24 → min = 16
    expect(vp.scale).toBeCloseTo(16)
    // centered: extent is 50*16=800 wide → tx 0; 25*16=400 tall → ty 100
    expect(vp.tx).toBeCloseTo(0)
    expect(vp.ty).toBeCloseTo(100)
  })

  it('never returns a scale below the floor for a tiny view', () => {
    const vp = fitViewport(10000, 10000, 20, 20)
    expect(vp.scale).toBe(MIN_SCALE)
  })
})

describe('gridStepFt', () => {
  it('uses 1-ft lines when zoomed in', () => {
    expect(gridStepFt(20)).toBe(1)
  })

  it('steps up as it zooms out to keep lines legible', () => {
    expect(gridStepFt(4)).toBe(5) // 1ft*4=4px < 8, 5ft*4=20px ok
    expect(gridStepFt(1)).toBe(10) // 5ft*1=5px < 8, 10ft*1=10px ok
  })

  it('caps at the largest step when extremely zoomed out', () => {
    expect(gridStepFt(0.01)).toBe(100)
  })
})

describe('snapFt', () => {
  it('snaps to the nearest step', () => {
    expect(snapFt(2.4, 1)).toBe(2)
    expect(snapFt(2.6, 1)).toBe(3)
    expect(snapFt(12.3, 5)).toBe(10)
    expect(snapFt(13, 5)).toBe(15)
  })

  it('is a no-op for a non-positive step', () => {
    expect(snapFt(2.4, 0)).toBe(2.4)
  })
})
