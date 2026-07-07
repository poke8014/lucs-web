import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UNIT_PRICE_USD,
  LANDSCAPED_AVG_WIDTH_FT,
  LANDSCAPED_CLEARANCE_FT,
  LAYER_SHARE_TARGETS,
  NATURALISTIC_MATRIX_SPACING_IN,
  estimateSection,
  landscapedFootprintFt2,
  matrixCellFt2,
} from './estimate'

// ── Hand-computed footprints (the load-bearing constants) ─────────────────────
// Landscaped: radius = 3/2 + 1 = 2.5 ft → area = π·2.5² = 6.25π ≈ 19.635 sq ft.
// Naturalistic: 15" = 1.25 ft → cell = 1.25² = 1.5625 sq ft.

describe('footprint / cell constants', () => {
  it('landscaped footprint is π·(width/2 + clearance)²', () => {
    const radius = LANDSCAPED_AVG_WIDTH_FT / 2 + LANDSCAPED_CLEARANCE_FT
    expect(radius).toBe(2.5)
    expect(landscapedFootprintFt2()).toBeCloseTo(Math.PI * 6.25, 10)
    expect(landscapedFootprintFt2()).toBeCloseTo(19.6349, 3)
  })

  it('naturalistic matrix cell is (spacing in feet)²', () => {
    expect(NATURALISTIC_MATRIX_SPACING_IN / 12).toBe(1.25)
    expect(matrixCellFt2()).toBeCloseTo(1.5625, 10)
  })

  it('layer shares sum to 1 (normalized midpoints)', () => {
    const sum =
      LAYER_SHARE_TARGETS.structural +
      LAYER_SHARE_TARGETS.seasonal +
      LAYER_SHARE_TARGETS.groundcover +
      LAYER_SHARE_TARGETS.filler
    expect(sum).toBeCloseTo(1, 10)
  })
})

describe('estimateSection — landscaped', () => {
  it('counts individually-spaced plants over the average footprint', () => {
    // A 200 sq ft bed ÷ 19.635 sq ft/plant = 10.19 → 10 plants.
    const est = estimateSection('landscaped', 200)
    expect(est.totalCount).toBe(10)
    // Landscaped doesn't split by layer — the whole count lands in one bucket.
    expect(est.byLayer.structural).toBe(10)
    expect(est.byLayer.seasonal).toBe(0)
    expect(est.byLayer.groundcover).toBe(0)
    expect(est.byLayer.filler).toBe(0)
  })

  it('lands in the afternoon effort band for a small bed', () => {
    // 100 sq ft ÷ 19.635 = 5.09 → 5 plants → "afternoon" (≤15).
    const est = estimateSection('landscaped', 100)
    expect(est.totalCount).toBe(5)
    expect(est.effortLabel).toBe('~5 plants — roughly an afternoon')
  })

  it('prices count × unit price with a ±20% band by default', () => {
    // 10 plants × $12 = $120 → low $96, high $144.
    const est = estimateSection('landscaped', 200)
    expect(est.unitPrice).toBe(DEFAULT_UNIT_PRICE_USD)
    expect(est.costLow).toBe(96)
    expect(est.costHigh).toBe(144)
  })

  it('respects an editable unit price and spread', () => {
    // 10 plants × $8 = $80 → ±10% → low $72, high $88.
    const est = estimateSection('landscaped', 200, { unitPrice: 8, costSpread: 0.1 })
    expect(est.totalCount).toBe(10)
    expect(est.costLow).toBe(72)
    expect(est.costHigh).toBe(88)
  })
})

describe('estimateSection — naturalistic', () => {
  it('splits the matrix grid count across the four layers', () => {
    // 200 sq ft ÷ 1.5625 = 128 matrix cells.
    // structural 12.5% → round(16) = 16
    // seasonal   30%   → round(38.4) = 38
    // groundcover 50%  → round(64) = 64
    // filler      7.5% → round(9.6) = 10
    // total = 16 + 38 + 64 + 10 = 128
    const est = estimateSection('naturalistic', 200)
    expect(est.byLayer.structural).toBe(16)
    expect(est.byLayer.seasonal).toBe(38)
    expect(est.byLayer.groundcover).toBe(64)
    expect(est.byLayer.filler).toBe(10)
    expect(est.totalCount).toBe(128)
  })

  it('lands in a heavier effort band than landscaped for the same area', () => {
    // Same 200 sq ft: naturalistic packs far denser than landscaped's 10.
    const natural = estimateSection('naturalistic', 200)
    const land = estimateSection('landscaped', 200)
    expect(natural.totalCount).toBeGreaterThan(land.totalCount)
    expect(natural.effortLabel).toBe('~128 plants — a few weekends')
  })

  it('groundcover is the largest layer (the ~50% weed-suppressing floor)', () => {
    const est = estimateSection('naturalistic', 320)
    expect(est.byLayer.groundcover).toBeGreaterThan(est.byLayer.seasonal)
    expect(est.byLayer.groundcover).toBeGreaterThan(est.byLayer.structural)
    expect(est.byLayer.groundcover).toBeGreaterThan(est.byLayer.filler)
  })

  it('prices the full matrix count × unit price', () => {
    // 128 plants × $12 = $1536 → ±20% → low $1228.8→1229, high $1843.2→1843.
    const est = estimateSection('naturalistic', 200)
    expect(est.costLow).toBe(1229)
    expect(est.costHigh).toBe(1843)
  })
})

describe('estimateSection — edge cases', () => {
  it('returns an all-zero estimate for a section with no area', () => {
    for (const style of ['landscaped', 'naturalistic'] as const) {
      const est = estimateSection(style, 0)
      expect(est.totalCount).toBe(0)
      expect(est.byLayer).toEqual({ structural: 0, seasonal: 0, groundcover: 0, filler: 0 })
      expect(est.costLow).toBe(0)
      expect(est.costHigh).toBe(0)
    }
  })

  it('clamps a negative area to zero', () => {
    expect(estimateSection('landscaped', -50).totalCount).toBe(0)
  })

  it('singularizes the effort label at one plant', () => {
    // ~20 sq ft ÷ 19.635 = 1.02 → 1 plant.
    const est = estimateSection('landscaped', 20)
    expect(est.totalCount).toBe(1)
    expect(est.effortLabel).toBe('~1 plant — roughly an afternoon')
  })
})
