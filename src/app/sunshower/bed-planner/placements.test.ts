import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MATRIX_SPACING_IN,
  DRIFT_STEPS,
  driftFootprintFt2,
  emptyLayerCounts,
  LAYER_TARGET_BANDS,
  layerShares,
  matrixCellFt2ForSpacing,
  nearestOdd,
  placementQuantity,
  placementSpeciesCounts,
  sectionQuantities,
  suggestDriftCount,
} from './placements'
import type { Placement, Point, Section } from './types'
import type { SelectorPlant } from '../plant-selector/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function plant(overrides: Partial<SelectorPlant> = {}): SelectorPlant {
  return {
    slug: 'test-plant',
    scientific_name: 'Testus plantus',
    common_names: ['test plant'],
    aliases: [],
    nativity: 'native',
    plant_type: 'perennial',
    height_ft: null,
    width_ft: null,
    height_ft_range: { raw: null, min: null, max: 2 },
    width_ft_range: { raw: null, min: null, max: 2 },
    water: null,
    sun: null,
    soil: [],
    bloom_season: [],
    pollinators: [],
    sociability: null,
    host_plant_for: [],
    native: null,
    cal_ipc_rating: null,
    ...overrides,
  }
}

/** A square polygon of the given side length (feet), corner at the origin. */
function square(side: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: side, y: 0 },
    { x: side, y: side },
    { x: 0, y: side },
  ]
}

function section(id: string, side: number): Section {
  return { id, name: id, polygon: square(side), labels: {}, phaseState: 'untouched' }
}

// ── nearestOdd ────────────────────────────────────────────────────────────────

describe('nearestOdd', () => {
  it('clamps to a minimum of 1', () => {
    expect(nearestOdd(0)).toBe(1)
    expect(nearestOdd(0.4)).toBe(1)
    expect(nearestOdd(1)).toBe(1)
    expect(nearestOdd(-5)).toBe(1)
  })

  it('keeps odd values', () => {
    expect(nearestOdd(3)).toBe(3)
    expect(nearestOdd(3.2)).toBe(3)
    expect(nearestOdd(7)).toBe(7)
  })

  it('nudges even values to the nearer odd', () => {
    expect(nearestOdd(4)).toBe(5) // 4 → nearer odd is 3 or 5; tie rounds up
    expect(nearestOdd(4.1)).toBe(5)
    expect(nearestOdd(3.9)).toBe(3)
    expect(nearestOdd(6)).toBe(7)
  })
})

describe('DRIFT_STEPS', () => {
  it('offers the odd stepper 3/5/7/9', () => {
    expect(DRIFT_STEPS).toEqual([3, 5, 7, 9])
  })
})

// ── drift footprint + count suggestion ────────────────────────────────────────

describe('driftFootprintFt2', () => {
  it('is π·(width/2 + 1)² using the plant max width', () => {
    // 2 ft wide → radius 2 → area 4π ≈ 12.566
    expect(driftFootprintFt2(plant({ width_ft_range: { raw: null, min: null, max: 2 } }))).toBeCloseTo(
      Math.PI * 4,
      6,
    )
    // 4 ft wide → radius 3 → area 9π ≈ 28.274
    expect(driftFootprintFt2(plant({ width_ft_range: { raw: null, min: null, max: 4 } }))).toBeCloseTo(
      Math.PI * 9,
      6,
    )
  })

  it('assumes a 2-ft width when size data is missing', () => {
    expect(driftFootprintFt2(plant({ width_ft_range: { raw: null, min: null, max: null } }))).toBeCloseTo(
      Math.PI * 4,
      6,
    )
  })
})

describe('suggestDriftCount', () => {
  it('is area ÷ footprint rounded to the nearest odd', () => {
    // 10x10 = 100 sq ft; footprint (2ft wide) ≈ 12.566 → 7.96 → 7 (nearest odd)
    const p = plant({ width_ft_range: { raw: null, min: null, max: 2 } })
    expect(suggestDriftCount(p, square(10))).toBe(7)
    // A larger patch reaches into the higher steps: 14x14 = 196 → 15.6 → 15
    expect(suggestDriftCount(p, square(14))).toBe(15)
  })

  it('is at least 1 for a real polygon', () => {
    const p = plant({ width_ft_range: { raw: null, min: null, max: 6 } })
    expect(suggestDriftCount(p, square(2))).toBe(1)
  })

  it('returns 0 for a degenerate polygon', () => {
    expect(suggestDriftCount(plant(), [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0)
  })
})

// ── matrix spacing ────────────────────────────────────────────────────────────

describe('matrixCellFt2ForSpacing', () => {
  it('is (spacing in feet)²', () => {
    expect(matrixCellFt2ForSpacing(12)).toBeCloseTo(1, 10) // 1 ft → 1 sq ft
    expect(matrixCellFt2ForSpacing(DEFAULT_MATRIX_SPACING_IN)).toBeCloseTo(1.5625, 10) // 15"
    expect(matrixCellFt2ForSpacing(18)).toBeCloseTo(2.25, 10) // 1.5 ft
  })

  it('clamps out-of-range spacing into the 12–18" band', () => {
    expect(matrixCellFt2ForSpacing(0)).toBeCloseTo(matrixCellFt2ForSpacing(12), 10) // → 12"
    expect(matrixCellFt2ForSpacing(48)).toBeCloseTo(matrixCellFt2ForSpacing(18), 10) // → 18"
  })
})

// ── placementQuantity + species counts ────────────────────────────────────────

describe('placementQuantity', () => {
  it('individual is always 1', () => {
    const pl: Placement = {
      kind: 'individual',
      id: 'a',
      sectionId: 's',
      plantSlug: 'oak',
      layerRole: 'structural',
      center: { x: 5, y: 5 },
    }
    expect(placementQuantity(pl, 400)).toBe(1)
  })

  it('drift is the traced count', () => {
    const pl: Placement = {
      kind: 'drift',
      id: 'b',
      sectionId: 's',
      plantSlug: 'poppy',
      layerRole: 'seasonal',
      area: square(6),
      count: 5,
    }
    expect(placementQuantity(pl, 400)).toBe(5)
  })

  it('matrixFill is the grid count over the covered area', () => {
    // 100 sq ft covered, 15" spacing (cell 1.5625) → 64 cells, one species at 100%
    const pl: Placement = {
      kind: 'matrixFill',
      id: 'c',
      sectionId: 's',
      layerRole: 'groundcover',
      mix: [{ plantSlug: 'yarrow', sharePct: 100 }],
      spacingIn: 15,
    }
    expect(placementQuantity(pl, 100)).toBe(64)
  })

  it('splits a matrixFill mix by share (normalized)', () => {
    // 100 sq ft, 12" spacing → 100 cells; 60/40 split → 60 / 40
    const pl: Placement = {
      kind: 'matrixFill',
      id: 'd',
      sectionId: 's',
      layerRole: 'groundcover',
      mix: [
        { plantSlug: 'yarrow', sharePct: 60 },
        { plantSlug: 'sedge', sharePct: 40 },
      ],
      spacingIn: 12,
    }
    const counts = placementSpeciesCounts(pl, 100)
    expect(counts).toEqual([
      { plantSlug: 'yarrow', count: 60 },
      { plantSlug: 'sedge', count: 40 },
    ])
    expect(placementQuantity(pl, 100)).toBe(100)
  })

  it('normalizes shares that do not sum to 100', () => {
    // shares 1:1 (not to 100) still split the 100-cell grid evenly
    const pl: Placement = {
      kind: 'matrixFill',
      id: 'e',
      sectionId: 's',
      layerRole: 'groundcover',
      mix: [
        { plantSlug: 'a', sharePct: 1 },
        { plantSlug: 'b', sharePct: 1 },
      ],
      spacingIn: 12,
    }
    const counts = placementSpeciesCounts(pl, 100)
    expect(counts.map((c) => c.count)).toEqual([50, 50])
  })
})

// ── sectionQuantities ─────────────────────────────────────────────────────────

describe('sectionQuantities', () => {
  it('rolls up counts per section, per layer, per species', () => {
    const sections = [section('s1', 10), section('s2', 10)] // both 100 sq ft
    const placements: Placement[] = [
      {
        kind: 'individual',
        id: 'p1',
        sectionId: 's1',
        plantSlug: 'oak',
        layerRole: 'structural',
        center: { x: 5, y: 5 },
      },
      {
        kind: 'drift',
        id: 'p2',
        sectionId: 's1',
        plantSlug: 'poppy',
        layerRole: 'seasonal',
        area: square(4),
        count: 5,
      },
      {
        kind: 'matrixFill',
        id: 'p3',
        sectionId: 's2',
        layerRole: 'groundcover',
        mix: [{ plantSlug: 'yarrow', sharePct: 100 }],
        spacingIn: 12,
      },
    ]

    const result = sectionQuantities(sections, placements)
    expect(result.s1.total).toBe(6) // 1 oak + 5 poppy
    expect(result.s1.byLayer.structural).toBe(1)
    expect(result.s1.byLayer.seasonal).toBe(5)
    expect(result.s1.bySpecies.oak).toBe(1)
    expect(result.s1.bySpecies.poppy).toBe(5)

    expect(result.s2.total).toBe(100) // 100 sq ft ÷ 1 sq ft cell
    expect(result.s2.byLayer.groundcover).toBe(100)
    expect(result.s2.bySpecies.yarrow).toBe(100)
  })

  it('skips placements whose section was deleted', () => {
    const sections = [section('s1', 10)]
    const placements: Placement[] = [
      {
        kind: 'individual',
        id: 'orphan',
        sectionId: 'gone',
        plantSlug: 'oak',
        layerRole: 'structural',
        center: { x: 1, y: 1 },
      },
    ]
    const result = sectionQuantities(sections, placements)
    expect(result.s1.total).toBe(0)
    expect(result.gone).toBeUndefined()
  })

  it('gives an empty section all-zero counts', () => {
    const result = sectionQuantities([section('s1', 10)], [])
    expect(result.s1.total).toBe(0)
    expect(result.s1.byLayer).toEqual(emptyLayerCounts())
  })
})

// ── layerShares ───────────────────────────────────────────────────────────────

describe('layerShares', () => {
  it('computes share of total per layer in stacking order', () => {
    const shares = layerShares({ structural: 1, seasonal: 3, groundcover: 5, filler: 1 })
    expect(shares.map((s) => s.role)).toEqual([
      'structural',
      'seasonal',
      'groundcover',
      'filler',
    ])
    expect(shares[0].share).toBeCloseTo(0.1, 6)
    expect(shares[2].share).toBeCloseTo(0.5, 6)
  })

  it('judges each layer against its target band', () => {
    // The 10/30/50/10 silhouette sits inside every band → all ok
    const shares = layerShares({ structural: 1, seasonal: 3, groundcover: 5, filler: 1 })
    expect(shares.every((s) => s.verdict === 'ok')).toBe(true)
  })

  it('flags a thin ground plane (the bare-soil failure mode)', () => {
    // All structural, no ground cover → groundcover reads thin
    const shares = layerShares({ structural: 10, seasonal: 0, groundcover: 0, filler: 0 })
    const gc = shares.find((s) => s.role === 'groundcover')
    expect(gc?.verdict).toBe('thin')
    const structural = shares.find((s) => s.role === 'structural')
    expect(structural?.verdict).toBe('heavy') // 100% >> 15%
  })

  it('treats an empty section as a thin ground plane', () => {
    const shares = layerShares(emptyLayerCounts())
    expect(shares.every((s) => s.share === 0)).toBe(true)
    const gc = shares.find((s) => s.role === 'groundcover')
    expect(gc?.verdict).toBe('thin')
  })

  it('target bands cover the spec silhouette', () => {
    expect(LAYER_TARGET_BANDS.structural).toEqual({ min: 0.1, max: 0.15 })
    expect(LAYER_TARGET_BANDS.groundcover.min).toBeLessThanOrEqual(0.5)
    expect(LAYER_TARGET_BANDS.groundcover.max).toBeGreaterThanOrEqual(0.5)
  })
})
