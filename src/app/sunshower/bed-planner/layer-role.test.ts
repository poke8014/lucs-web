// Unit tests for layerRole.ts — the layer-role + placement-kind suggestion
// heuristic.
//
// Tests use real corpus slugs (acer-macrophyllum: tree, agrostis-pallens: grass,
// achillea-millefolium: mid perennial, acmispon-americanus: annual) plus a
// fabricated SelectorPlant fixture for the sociability override path.

import { describe, expect, it } from 'vitest'
import { plantBySlug, nativePlants } from '../plant-selector/corpus'
import type { SelectorPlant } from '../plant-selector/types'
import { suggestPlacement } from './layerRole'

// ── Fixture builder ───────────────────────────────────────────────────────────
// Build a minimal SelectorPlant with only the fields layerRole.ts reads,
// so tests don't depend on the full corpus shape for edge-case probing.

function makePlant(
  overrides: Partial<SelectorPlant> & { plant_type?: string | null },
): SelectorPlant {
  return {
    slug: 'test-plant',
    scientific_name: 'Testus plantus',
    common_names: ['Test Plant'],
    aliases: [],
    nativity: 'native',
    plant_type: null,
    height_ft: null,
    width_ft: null,
    height_ft_range: { raw: null, min: null, max: null },
    width_ft_range: { raw: null, min: null, max: null },
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

// ── Archetype tests (real corpus slugs) ───────────────────────────────────────

describe('suggestPlacement — archetype archetypes from real corpus', () => {
  it('tree (acer-macrophyllum) → structural + individual', () => {
    const plant = plantBySlug('acer-macrophyllum')
    expect(plant).toBeDefined()
    const s = suggestPlacement(plant!)
    expect(s.layerRole).toBe('structural')
    expect(s.kind).toBe('individual')
    expect(s.confidence).toBe('low') // no sociability data
    expect(s.reason).toMatch(/tree/i)
  })

  it('grass (agrostis-pallens) → groundcover + matrixFill', () => {
    const plant = plantBySlug('agrostis-pallens')
    expect(plant).toBeDefined()
    const s = suggestPlacement(plant!)
    expect(s.layerRole).toBe('groundcover')
    expect(s.kind).toBe('matrixFill')
    expect(s.confidence).toBe('low')
    expect(s.reason).toMatch(/grass/i)
  })

  it('mid perennial (achillea-millefolium, h=3ft) → seasonal + drift', () => {
    const plant = plantBySlug('achillea-millefolium')
    expect(plant).toBeDefined()
    // height max 3 ft → mid-range (2–8) → seasonal drift
    expect(plant!.height_ft_range.max).toBe(3)
    const s = suggestPlacement(plant!)
    expect(s.layerRole).toBe('seasonal')
    expect(s.kind).toBe('drift')
    expect(s.confidence).toBe('low')
  })

  it('annual (acmispon-americanus) → filler + matrixFill', () => {
    const plant = plantBySlug('acmispon-americanus')
    expect(plant).toBeDefined()
    const s = suggestPlacement(plant!)
    expect(s.layerRole).toBe('filler')
    expect(s.kind).toBe('matrixFill')
    expect(s.confidence).toBe('low')
    expect(s.reason).toMatch(/annual/i)
  })

  it('large shrub (baccharis-salicifolia, h=12ft) → structural + individual', () => {
    const plant = plantBySlug('baccharis-salicifolia')
    expect(plant).toBeDefined()
    expect(plant!.height_ft_range.max).toBeGreaterThan(8)
    const s = suggestPlacement(plant!)
    expect(s.layerRole).toBe('structural')
    expect(s.kind).toBe('individual')
    expect(s.confidence).toBe('low')
  })

  it('mid shrub (berberis-pinnata, h≤8ft) → seasonal + drift', () => {
    const plant = plantBySlug('berberis-pinnata')
    expect(plant).toBeDefined()
    const max = plant!.height_ft_range.max ?? 0
    expect(max).toBeGreaterThan(2)
    expect(max).toBeLessThanOrEqual(8)
    const s = suggestPlacement(plant!)
    expect(s.layerRole).toBe('seasonal')
    expect(s.kind).toBe('drift')
    expect(s.confidence).toBe('low')
  })
})

// ── Sociability override path ─────────────────────────────────────────────────
// sociability is currently null for all 150 natives. These tests fabricate
// a SelectorPlant with sociability set to confirm the priority path fires.

describe('suggestPlacement — sociability override (fabricated plants)', () => {
  it('sociability 1 → structural + individual, confidence medium', () => {
    const plant = makePlant({ sociability: 1 })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('structural')
    expect(s.kind).toBe('individual')
    expect(s.confidence).toBe('medium')
  })

  it('sociability 2 → structural + individual, confidence medium', () => {
    const plant = makePlant({ sociability: 2 })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('structural')
    expect(s.kind).toBe('individual')
    expect(s.confidence).toBe('medium')
  })

  it('sociability 3 → seasonal + drift, confidence medium', () => {
    const plant = makePlant({ sociability: 3 })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('seasonal')
    expect(s.kind).toBe('drift')
    expect(s.confidence).toBe('medium')
  })

  it('sociability 4 → groundcover + matrixFill, confidence medium', () => {
    const plant = makePlant({ sociability: 4 })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('groundcover')
    expect(s.kind).toBe('matrixFill')
    expect(s.confidence).toBe('medium')
  })

  it('sociability 5 → groundcover + matrixFill, confidence medium', () => {
    const plant = makePlant({ sociability: 5 })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('groundcover')
    expect(s.kind).toBe('matrixFill')
    expect(s.confidence).toBe('medium')
  })

  it('sociability takes priority over plant_type when both are set', () => {
    // A tree-type plant with sociability=5 should go to groundcover (sociability wins).
    const plant = makePlant({ plant_type: 'tree', sociability: 5 })
    const s = suggestPlacement(plant)
    // sociability path fires first
    expect(s.confidence).toBe('medium')
    expect(s.layerRole).toBe('groundcover')
    expect(s.kind).toBe('matrixFill')
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('suggestPlacement — edge cases', () => {
  it('vine → seasonal + drift', () => {
    const plant = makePlant({ plant_type: 'vine' })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('seasonal')
    expect(s.kind).toBe('drift')
  })

  it('no type + no size → seasonal + drift (safe default)', () => {
    const plant = makePlant({ plant_type: null })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('seasonal')
    expect(s.kind).toBe('drift')
    expect(s.confidence).toBe('low')
    expect(s.reason).toMatch(/size data/i)
  })

  it('perennial ≤2ft → groundcover + matrixFill', () => {
    const plant = makePlant({
      plant_type: 'perennial',
      height_ft_range: { raw: '0.5 - 1.5', min: 0.5, max: 1.5 },
    })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('groundcover')
    expect(s.kind).toBe('matrixFill')
  })

  it('shrub >8ft → structural + individual', () => {
    const plant = makePlant({
      plant_type: 'shrub',
      height_ft_range: { raw: '10 - 15', min: 10, max: 15 },
    })
    const s = suggestPlacement(plant)
    expect(s.layerRole).toBe('structural')
    expect(s.kind).toBe('individual')
  })

  it('never throws across the full native corpus', () => {
    for (const p of nativePlants()) {
      expect(() => suggestPlacement(p)).not.toThrow()
    }
  })

  it('always returns a non-empty reason string', () => {
    const plants = [
      makePlant({ plant_type: 'tree' }),
      makePlant({ plant_type: 'grass' }),
      makePlant({ plant_type: 'annual' }),
      makePlant({ plant_type: 'shrub', height_ft_range: { raw: '4', min: 4, max: 4 } }),
      makePlant({ sociability: 3 }),
    ]
    for (const p of plants) {
      const s = suggestPlacement(p)
      expect(s.reason.length).toBeGreaterThan(0)
    }
  })
})
