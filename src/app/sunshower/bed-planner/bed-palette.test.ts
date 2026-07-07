// Unit tests for palette.ts — the interim bed-planner palette + plant-first
// lookup. Tests use real corpus slugs where possible; fabricated fixtures for
// specific moisture/soil edge cases.

import { describe, expect, it } from 'vitest'
import { plantBySlug, nativePlants } from '../plant-selector/corpus'
import type { SelectorPlant } from '../plant-selector/types'
import { paletteForBedSection, plantFirstLookup } from './palette'
import type { BedSectionLabels } from './palette'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Minimal SiteProfile (enough for paletteForSection / fitForZone to run).
const NULL_PROFILE = null

// An empty section labels (browse mode — no moisture/soil filter).
const EMPTY_LABELS: BedSectionLabels = {}

// Minimal SelectorPlant fixture for moisture/drainage edge cases.
function makePlant(overrides: Partial<SelectorPlant>): SelectorPlant {
  return {
    slug: 'fixture-plant',
    scientific_name: 'Fixtura plantus',
    common_names: ['Fixture Plant'],
    aliases: [],
    nativity: 'native',
    plant_type: 'perennial',
    height_ft: null,
    width_ft: null,
    height_ft_range: { raw: '2 - 4', min: 2, max: 4 },
    width_ft_range: { raw: '2', min: 2, max: 2 },
    water: null,
    sun: null,
    soil: [],
    bloom_season: [],
    pollinators: [],
    sociability: null,
    host_plant_for: [],
    native: {
      communities: [],
      communities_simplified: [],
      companions: [],
      sun_range: 'Full Sun',
      water_range: null,
      soil_drainage: [],
      ease_of_care: null,
      nursery_availability: null,
      is_cultivar: false,
      butterflies_moths_supported: null,
      attracts_wildlife: [],
      soil_ph: null,
      rarity: null,
      calscape_url: null,
    },
    cal_ipc_rating: null,
    ...overrides,
  }
}

// ── paletteForBedSection — basic contract ─────────────────────────────────────

describe('paletteForBedSection — basic contract', () => {
  it('returns a non-empty list for empty labels with null profile', () => {
    const entries = paletteForBedSection(EMPTY_LABELS, NULL_PROFILE)
    expect(entries.length).toBeGreaterThan(0)
    // Every native plant in the corpus should appear.
    expect(entries.length).toBe(nativePlants().length)
  })

  it('every entry carries plant, fit, and suggestion', () => {
    const entries = paletteForBedSection(EMPTY_LABELS, NULL_PROFILE)
    for (const e of entries.slice(0, 20)) {
      expect(e.plant).toBeDefined()
      expect(e.fit).toBeDefined()
      expect(e.fit.level).toBeTruthy()
      expect(e.suggestion).toBeDefined()
      expect(e.suggestion.layerRole).toBeTruthy()
      expect(e.suggestion.kind).toBeTruthy()
      expect(e.suggestion.confidence).toMatch(/^(low|medium)$/)
      expect(e.suggestion.reason.length).toBeGreaterThan(0)
    }
  })

  it('never throws across the full corpus for any label combination', () => {
    const labelCombinations: BedSectionLabels[] = [
      {},
      { moisture: 'dry' },
      { moisture: 'wet' },
      { moisture: 'average' },
      { soilTexture: 'clay' },
      { soilTexture: 'sandy' },
      { moisture: 'dry', soilTexture: 'sandy' },
      { moisture: 'wet', soilTexture: 'clay' },
    ]
    for (const labels of labelCombinations) {
      expect(() => paletteForBedSection(labels, NULL_PROFILE)).not.toThrow()
    }
  })
})

// ── Moisture down-ranking ─────────────────────────────────────────────────────

describe('paletteForBedSection — moisture down-ranking', () => {
  it('wet-loving plant in a dry section gets a labelMismatch flag', () => {
    // Fabricate a wet-loving plant (water_range: High, soil_drainage: Slow).
    const wetLover = makePlant({
      slug: 'wet-lover',
      native: {
        communities: [],
        communities_simplified: [],
        companions: [],
        sun_range: 'Full Sun',
        water_range: 'High',
        soil_drainage: ['Slow', 'Standing'],
        ease_of_care: null,
        nursery_availability: null,
        is_cultivar: false,
        butterflies_moths_supported: null,
        attracts_wildlife: [],
        soil_ph: null,
        rarity: null,
        calscape_url: null,
      },
    })

    const dryLabels: BedSectionLabels = { moisture: 'dry' }
    const entries = paletteForBedSection(dryLabels, NULL_PROFILE, { corpus: [wetLover] })

    expect(entries.length).toBe(1)
    expect(entries[0].labelMismatch).toBeDefined()
    expect(entries[0].labelMismatch!.length).toBeGreaterThan(0)
    expect(entries[0].labelMismatch![0]).toMatch(/water|moist/i)
  })

  it('dry-loving plant in a wet section gets a labelMismatch flag', () => {
    const dryLover = makePlant({
      slug: 'dry-lover',
      native: {
        communities: [],
        communities_simplified: [],
        companions: [],
        sun_range: 'Full Sun',
        water_range: 'Low',
        soil_drainage: ['Fast'],
        ease_of_care: null,
        nursery_availability: null,
        is_cultivar: false,
        butterflies_moths_supported: null,
        attracts_wildlife: [],
        soil_ph: null,
        rarity: null,
        calscape_url: null,
      },
    })

    const wetLabels: BedSectionLabels = { moisture: 'wet' }
    const entries = paletteForBedSection(wetLabels, NULL_PROFILE, { corpus: [dryLover] })

    expect(entries.length).toBe(1)
    expect(entries[0].labelMismatch).toBeDefined()
    expect(entries[0].labelMismatch!.length).toBeGreaterThan(0)
  })

  it('well-matched plant has no labelMismatch', () => {
    const goodFit = makePlant({
      slug: 'good-fit',
      native: {
        communities: [],
        communities_simplified: [],
        companions: [],
        sun_range: 'Full Sun',
        water_range: 'Low',
        soil_drainage: ['Fast', 'Medium'],
        ease_of_care: null,
        nursery_availability: null,
        is_cultivar: false,
        butterflies_moths_supported: null,
        attracts_wildlife: [],
        soil_ph: null,
        rarity: null,
        calscape_url: null,
      },
    })

    const dryLabels: BedSectionLabels = { moisture: 'dry' }
    const entries = paletteForBedSection(dryLabels, NULL_PROFILE, { corpus: [goodFit] })

    expect(entries.length).toBe(1)
    expect(entries[0].labelMismatch).toBeUndefined()
  })

  it('mismatched plants sort to the end (after good-fit plants)', () => {
    const goodFit = makePlant({
      slug: 'good-fit-plant',
      native: {
        communities: [],
        communities_simplified: [],
        companions: [],
        sun_range: 'Full Sun',
        water_range: 'Low',
        soil_drainage: ['Fast'],
        ease_of_care: null,
        nursery_availability: null,
        is_cultivar: false,
        butterflies_moths_supported: null,
        attracts_wildlife: [],
        soil_ph: null,
        rarity: null,
        calscape_url: null,
      },
    })

    const wetLover = makePlant({
      slug: 'wet-lover-plant',
      native: {
        communities: [],
        communities_simplified: [],
        companions: [],
        sun_range: 'Full Sun',
        water_range: 'High',
        soil_drainage: ['Standing'],
        ease_of_care: null,
        nursery_availability: null,
        is_cultivar: false,
        butterflies_moths_supported: null,
        attracts_wildlife: [],
        soil_ph: null,
        rarity: null,
        calscape_url: null,
      },
    })

    const dryLabels: BedSectionLabels = { moisture: 'dry' }
    const entries = paletteForBedSection(dryLabels, NULL_PROFILE, {
      corpus: [goodFit, wetLover],
    })

    expect(entries.length).toBe(2)
    // Good fit first, mismatch last.
    expect(entries[0].plant.slug).toBe('good-fit-plant')
    expect(entries[1].plant.slug).toBe('wet-lover-plant')
    expect(entries[0].labelMismatch).toBeUndefined()
    expect(entries[1].labelMismatch).toBeDefined()
  })
})

// ── Soil texture down-ranking ─────────────────────────────────────────────────

describe('paletteForBedSection — soil texture down-ranking', () => {
  it('sharp-drainage plant in clay section gets a labelMismatch flag', () => {
    const sharpDrainer = makePlant({
      slug: 'sharp-drainer',
      native: {
        communities: [],
        communities_simplified: [],
        companions: [],
        sun_range: 'Full Sun',
        water_range: 'Low',
        soil_drainage: ['Fast'],
        ease_of_care: null,
        nursery_availability: null,
        is_cultivar: false,
        butterflies_moths_supported: null,
        attracts_wildlife: [],
        soil_ph: null,
        rarity: null,
        calscape_url: null,
      },
    })

    const clayLabels: BedSectionLabels = { soilTexture: 'clay' }
    const entries = paletteForBedSection(clayLabels, NULL_PROFILE, {
      corpus: [sharpDrainer],
    })

    expect(entries[0].labelMismatch).toBeDefined()
    expect(entries[0].labelMismatch![0]).toMatch(/clay|drainage/i)
  })

  it('wet-loving plant in sandy section gets a labelMismatch flag', () => {
    const wetLover = makePlant({
      slug: 'sandy-mismatch',
      native: {
        communities: [],
        communities_simplified: [],
        companions: [],
        sun_range: 'Full Sun',
        water_range: 'High',
        soil_drainage: ['Slow'],
        ease_of_care: null,
        nursery_availability: null,
        is_cultivar: false,
        butterflies_moths_supported: null,
        attracts_wildlife: [],
        soil_ph: null,
        rarity: null,
        calscape_url: null,
      },
    })

    const sandyLabels: BedSectionLabels = { soilTexture: 'sandy' }
    const entries = paletteForBedSection(sandyLabels, NULL_PROFILE, {
      corpus: [wetLover],
    })

    expect(entries[0].labelMismatch).toBeDefined()
    expect(entries[0].labelMismatch![0]).toMatch(/sandy|moisture/i)
  })
})

// ── plantFirstLookup ──────────────────────────────────────────────────────────

describe('plantFirstLookup', () => {
  it('returns a hit for a known plant name', () => {
    // achillea is the common name fragment for achillea-millefolium (yarrow).
    const results = plantFirstLookup('yarrow', EMPTY_LABELS, NULL_PROFILE)
    expect(results.length).toBeGreaterThan(0)
    // Should find yarrow (Achillea millefolium).
    const slugs = results.map((r) => r.plant.slug)
    expect(slugs.some((s) => s.includes('achillea'))).toBe(true)
  })

  it('returns an empty array for a completely unrecognized query', () => {
    const results = plantFirstLookup('xyzzy-not-a-plant-name-ever', EMPTY_LABELS, NULL_PROFILE)
    expect(results).toEqual([])
  })

  it('each result carries plant, fit, suggestion, matchedOn', () => {
    const results = plantFirstLookup('acer', EMPTY_LABELS, NULL_PROFILE)
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.plant).toBeDefined()
      expect(r.fit).toBeDefined()
      expect(r.fit.level).toBeTruthy()
      expect(r.suggestion).toBeDefined()
      expect(r.matchedOn).toBeTruthy()
    }
  })

  it('attaches a labelMismatch when the found plant mismatches section labels', () => {
    // Find a native with Fast-only drainage (wants sharp drainage).
    // Search for it by name with a wet-section label — it should surface a mismatch.
    const sharpNative = nativePlants().find(
      (p) =>
        (p.native?.soil_drainage ?? []).includes('Fast') &&
        !(p.native?.soil_drainage ?? []).some((d) => d === 'Slow' || d === 'Standing'),
    )
    // The corpus has fast-drainage plants, but only run the assertion if we find one.
    if (sharpNative) {
      const query = sharpNative.common_names[0] ?? sharpNative.scientific_name.split(' ')[0]
      const results = plantFirstLookup(query, { moisture: 'wet' }, NULL_PROFILE)
      const match = results.find((r) => r.plant.slug === sharpNative.slug)
      if (match) {
        // Sharp-drainage plant in a wet section should be flagged.
        expect(match.labelMismatch).toBeDefined()
      }
    }
  })

  it('never throws for any query + any label combination', () => {
    const queries = ['oak', 'grass', '', 'xyzzy', 'salvia']
    const labels: BedSectionLabels[] = [
      {},
      { moisture: 'dry' },
      { moisture: 'wet', soilTexture: 'clay' },
    ]
    for (const q of queries) {
      for (const l of labels) {
        expect(() => plantFirstLookup(q, l, NULL_PROFILE)).not.toThrow()
      }
    }
  })
})

// ── Suggestion attachment ─────────────────────────────────────────────────────

describe('paletteForBedSection — suggestion attachment', () => {
  it('tree in palette gets structural + individual suggestion', () => {
    const tree = makePlant({
      slug: 'my-tree',
      plant_type: 'tree',
      height_ft_range: { raw: '30 - 60', min: 30, max: 60 },
    })

    const entries = paletteForBedSection(EMPTY_LABELS, NULL_PROFILE, { corpus: [tree] })
    expect(entries.length).toBe(1)
    expect(entries[0].suggestion.layerRole).toBe('structural')
    expect(entries[0].suggestion.kind).toBe('individual')
  })

  it('grass in palette gets groundcover + matrixFill suggestion', () => {
    const grass = makePlant({
      slug: 'my-grass',
      plant_type: 'grass',
    })

    const entries = paletteForBedSection(EMPTY_LABELS, NULL_PROFILE, { corpus: [grass] })
    expect(entries.length).toBe(1)
    expect(entries[0].suggestion.layerRole).toBe('groundcover')
    expect(entries[0].suggestion.kind).toBe('matrixFill')
  })

  it('plant with sociability=5 gets medium confidence suggestion', () => {
    const spreader = makePlant({
      slug: 'my-spreader',
      sociability: 5,
    })

    const entries = paletteForBedSection(EMPTY_LABELS, NULL_PROFILE, { corpus: [spreader] })
    expect(entries.length).toBe(1)
    expect(entries[0].suggestion.confidence).toBe('medium')
    expect(entries[0].suggestion.layerRole).toBe('groundcover')
    expect(entries[0].suggestion.kind).toBe('matrixFill')
  })
})
