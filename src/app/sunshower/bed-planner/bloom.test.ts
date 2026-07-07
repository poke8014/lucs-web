import { describe, expect, it } from 'vitest'
import {
  bloomCounts,
  bloomingSlugs,
  bloomSummary,
  normalizeBloomSeasons,
  placementBloomState,
} from './bloom'
import type { Placement, Point } from './types'
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

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]

function individual(slug: string): Extract<Placement, { kind: 'individual' }> {
  return {
    kind: 'individual',
    id: 'p1',
    sectionId: 's1',
    plantSlug: slug,
    layerRole: 'seasonal',
    center: { x: 5, y: 5 },
  }
}

function drift(slug: string, count = 3): Extract<Placement, { kind: 'drift' }> {
  return {
    kind: 'drift',
    id: 'p2',
    sectionId: 's1',
    plantSlug: slug,
    layerRole: 'seasonal',
    area: square,
    count,
  }
}

function matrixFill(
  mix: { plantSlug: string; sharePct: number }[],
): Extract<Placement, { kind: 'matrixFill' }> {
  return {
    kind: 'matrixFill',
    id: 'p3',
    sectionId: 's1',
    layerRole: 'groundcover',
    mix,
    spacingIn: 15,
  }
}

// ── normalizeBloomSeasons ──────────────────────────────────────────────────────

describe('normalizeBloomSeasons', () => {
  it('maps lowercase season strings correctly', () => {
    const p = plant({ bloom_season: ['spring', 'summer'] })
    expect(normalizeBloomSeasons(p)).toEqual(['spring', 'summer'])
  })

  it('is case-insensitive', () => {
    const p = plant({ bloom_season: ['Spring', 'SUMMER', 'Fall', 'WINTER'] })
    expect(normalizeBloomSeasons(p)).toEqual(['spring', 'summer', 'fall', 'winter'])
  })

  it('drops unknown tokens silently', () => {
    const p = plant({ bloom_season: ['spring', 'monsoon', 'summer'] })
    expect(normalizeBloomSeasons(p)).toEqual(['spring', 'summer'])
  })

  it('deduplicates', () => {
    const p = plant({ bloom_season: ['spring', 'spring', 'summer'] })
    expect(normalizeBloomSeasons(p)).toEqual(['spring', 'summer'])
  })

  it('returns [] for empty bloom_season', () => {
    const p = plant({ bloom_season: [] })
    expect(normalizeBloomSeasons(p)).toEqual([])
  })

  it('handles real corpus entries (achillea-millefolium style)', () => {
    // Achillea millefolium blooms spring + summer in the real corpus
    const p = plant({ slug: 'achillea-millefolium', bloom_season: ['spring', 'summer'] })
    expect(normalizeBloomSeasons(p)).toContain('spring')
    expect(normalizeBloomSeasons(p)).toContain('summer')
    expect(normalizeBloomSeasons(p)).not.toContain('winter')
  })
})

// ── bloomingSlugs ──────────────────────────────────────────────────────────────

describe('bloomingSlugs', () => {
  const springPlant = plant({ slug: 'spring-plant', bloom_season: ['spring'] })
  const summerPlant = plant({ slug: 'summer-plant', bloom_season: ['summer'] })
  const bothPlant = plant({ slug: 'both-plant', bloom_season: ['spring', 'summer'] })
  const noBloom = plant({ slug: 'no-bloom', bloom_season: [] })

  it('returns slugs for plants blooming in the given season', () => {
    const slugs = bloomingSlugs([springPlant, summerPlant, bothPlant, noBloom], 'spring')
    expect(slugs.has('spring-plant')).toBe(true)
    expect(slugs.has('both-plant')).toBe(true)
    expect(slugs.has('summer-plant')).toBe(false)
    expect(slugs.has('no-bloom')).toBe(false)
  })

  it('returns empty set when nothing blooms in that season', () => {
    const slugs = bloomingSlugs([springPlant, summerPlant], 'winter')
    expect(slugs.size).toBe(0)
  })

  it('works with real corpus plant: acer-macrophyllum (winter + spring)', () => {
    const acer = plant({ slug: 'acer-macrophyllum', bloom_season: ['winter', 'spring'] })
    expect(bloomingSlugs([acer], 'winter').has('acer-macrophyllum')).toBe(true)
    expect(bloomingSlugs([acer], 'spring').has('acer-macrophyllum')).toBe(true)
    expect(bloomingSlugs([acer], 'summer').has('acer-macrophyllum')).toBe(false)
  })
})

// ── placementBloomState ────────────────────────────────────────────────────────

describe('placementBloomState', () => {
  const springSlug = 'spring-plant'
  const noBloomSlug = 'quiet-plant'

  describe('individual placement', () => {
    it('returns in_bloom when the plant blooms in the season', () => {
      const slugs = new Set([springSlug])
      expect(placementBloomState(individual(springSlug), 'spring', slugs)).toBe('in_bloom')
    })

    it('returns quiet when the plant does not bloom', () => {
      const slugs = new Set([springSlug])
      expect(placementBloomState(individual(noBloomSlug), 'spring', slugs)).toBe('quiet')
    })
  })

  describe('drift placement', () => {
    it('returns in_bloom when the drift species blooms', () => {
      const slugs = new Set([springSlug])
      expect(placementBloomState(drift(springSlug), 'spring', slugs)).toBe('in_bloom')
    })

    it('returns quiet when the drift species does not bloom', () => {
      expect(placementBloomState(drift(noBloomSlug), 'spring', new Set([springSlug]))).toBe('quiet')
    })
  })

  describe('matrixFill placement', () => {
    it('returns in_bloom when ≥50% share-weighted species bloom', () => {
      // 60% blooming (springSlug) + 40% quiet
      const p = matrixFill([
        { plantSlug: springSlug, sharePct: 60 },
        { plantSlug: noBloomSlug, sharePct: 40 },
      ])
      const slugs = new Set([springSlug])
      expect(placementBloomState(p, 'spring', slugs)).toBe('in_bloom')
    })

    it('returns partial when <50% share-weighted species bloom', () => {
      // 30% blooming (springSlug) + 70% quiet
      const p = matrixFill([
        { plantSlug: springSlug, sharePct: 30 },
        { plantSlug: noBloomSlug, sharePct: 70 },
      ])
      const slugs = new Set([springSlug])
      expect(placementBloomState(p, 'spring', slugs)).toBe('partial')
    })

    it('returns quiet when no mix species bloom', () => {
      const p = matrixFill([
        { plantSlug: noBloomSlug, sharePct: 50 },
        { plantSlug: 'other-quiet', sharePct: 50 },
      ])
      const slugs = new Set([springSlug])
      expect(placementBloomState(p, 'spring', slugs)).toBe('quiet')
    })

    it('returns quiet for empty mix', () => {
      const p = matrixFill([])
      expect(placementBloomState(p, 'spring', new Set([springSlug]))).toBe('quiet')
    })

    it('handles exact 50% boundary as in_bloom', () => {
      const p = matrixFill([
        { plantSlug: springSlug, sharePct: 50 },
        { plantSlug: noBloomSlug, sharePct: 50 },
      ])
      const slugs = new Set([springSlug])
      expect(placementBloomState(p, 'spring', slugs)).toBe('in_bloom')
    })
  })
})

// ── bloomSummary ───────────────────────────────────────────────────────────────

describe('bloomSummary', () => {
  const springP = plant({ slug: 'spring-p', bloom_season: ['spring'] })
  const summerP = plant({ slug: 'summer-p', bloom_season: ['summer'] })
  const noBloomP = plant({ slug: 'no-bloom-p', bloom_season: [] })

  it('counts placements by bloom state per season', () => {
    const placements: Placement[] = [
      individual('spring-p'),
      drift('summer-p'),
      { ...individual('no-bloom-p'), id: 'p4' },
    ]
    const corpus = [springP, summerP, noBloomP]
    const summary = bloomSummary(placements, corpus)

    // Spring: spring-p in_bloom, summer-p quiet, no-bloom-p quiet
    expect(summary.spring.in_bloom).toBe(1)
    expect(summary.spring.quiet).toBe(2)

    // Summer: spring-p quiet, summer-p in_bloom, no-bloom-p quiet
    expect(summary.summer.in_bloom).toBe(1)
    expect(summary.summer.quiet).toBe(2)

    // Winter: nothing blooms
    expect(summary.winter.in_bloom).toBe(0)
    expect(summary.winter.quiet).toBe(3)
  })

  it('handles empty placements', () => {
    const summary = bloomSummary([], [springP])
    expect(summary.spring.in_bloom).toBe(0)
    expect(summary.spring.quiet).toBe(0)
  })
})

// ── bloomCounts ────────────────────────────────────────────────────────────────

describe('bloomCounts', () => {
  it('returns in_bloom + partial as the count per season', () => {
    const springP = plant({ slug: 'spring-p', bloom_season: ['spring'] })
    const noBP = plant({ slug: 'no-bloom', bloom_season: [] })

    // One spring bloomer individual + one matrix with partial bloom in spring
    const mfp = matrixFill([
      { plantSlug: 'spring-p', sharePct: 30 }, // partial (< 50%)
      { plantSlug: 'no-bloom', sharePct: 70 },
    ])
    const placements: Placement[] = [individual('spring-p'), mfp]
    const corpus = [springP, noBP]
    const counts = bloomCounts(placements, corpus)

    // Spring: 1 in_bloom (individual) + 1 partial (matrix) = 2
    expect(counts.spring).toBe(2)
    // Winter: 0
    expect(counts.winter).toBe(0)
  })
})
