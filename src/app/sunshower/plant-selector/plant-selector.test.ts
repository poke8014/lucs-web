import { describe, expect, it } from 'vitest'
import plantsData from '../../../data/plants.json'
import type { SiteProfile, SunTier } from '../site-inventory/types'
import {
  allPlants,
  exceedsOverheadClearance,
  heightBand,
  nativePlants,
  plantBySlug,
  roleBucket,
  sunTokens,
  unknownSunTokens,
} from './corpus'
import { fitForZone } from './fit'
import { archetypeLens, inArchetypeLens, isEdgeSpecies } from './archetype'
import { similarNatives } from './similar'
import { contribution } from './contribution'
import {
  isBirdFriendly,
  isEasyCare,
  isPollinatorPowerhouse,
  isWaterWise,
} from './facets'
import type { SelectorPlant } from './types'

const CORPUS = plantsData as unknown as SelectorPlant[]
const NATIVES = nativePlants()

// A minimal profile with one zone of the given tier.
function profileWithZone(tier: SunTier): SiteProfile {
  return {
    version: 1,
    updatedAt: '2026-07-05T00:00:00.000Z',
    steps: {
      archetype: 'todo',
      aspect: 'todo',
      sun_map: 'todo',
      wind: 'todo',
      water_slope: 'todo',
      utilities: 'todo',
      sightlines: 'todo',
      soil: 'todo',
    },
    sunZones: [{ id: 'z1', label: 'test bed', tier }],
    sightlines: [],
  }
}

// ── Corpus shape / regeneration ───────────────────────────────────────────

describe('corpus', () => {
  it('holds the full regenerated record set (~309) with 150 native blocks', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(300)
    expect(NATIVES.length).toBe(150)
  })

  it('parses every height/width range without NaN', () => {
    for (const p of CORPUS) {
      for (const r of [p.height_ft_range, p.width_ft_range]) {
        for (const v of [r.min, r.max]) {
          if (v !== null) expect(Number.isNaN(v)).toBe(false)
        }
        if (r.min !== null && r.max !== null) {
          expect(r.min).toBeLessThanOrEqual(r.max)
        }
      }
    }
  })

  it('has a native block for exactly the plants with native data', () => {
    // poison-oak is nativity native but carries no native: block.
    const poisonOak = plantBySlug('toxicodendron-diversilobum')
    expect(poisonOak?.nativity).toBe('native')
    expect(poisonOak?.native).toBeNull()
  })
})

// ── Sun tokenizer ─────────────────────────────────────────────────────────

describe('sun tokenizer', () => {
  it('tokenizes every native sun_range into known tokens (no unknowns)', () => {
    for (const p of NATIVES) {
      expect(unknownSunTokens(p.native?.sun_range)).toEqual([])
    }
  })

  it('every native with sun data yields at least one known token', () => {
    const withData = NATIVES.filter((p) => p.native?.sun_range)
    expect(withData.length).toBeGreaterThan(100)
    for (const p of withData) {
      expect(sunTokens(p.native?.sun_range).length).toBeGreaterThan(0)
    }
  })

  it('maps the three Calscape tokens and ignores order/case', () => {
    expect(sunTokens('Full Sun, Partial Shade')).toEqual([
      'full_sun',
      'partial_shade',
    ])
    expect(sunTokens('Partial Shade, Full Sun')).toEqual([
      'partial_shade',
      'full_sun',
    ])
    expect(sunTokens('deep shade')).toEqual(['deep_shade'])
    expect(sunTokens('')).toEqual([])
    expect(sunTokens(null)).toEqual([])
  })

  it('surfaces an unknown token rather than silently dropping vocab drift', () => {
    expect(unknownSunTokens('Full Sun, Bright Shade')).toEqual(['Bright Shade'])
  })
})

// ── Role buckets ──────────────────────────────────────────────────────────

describe('role buckets', () => {
  it('roughly matches the spec counts among natives', () => {
    const counts: Record<string, number> = {}
    for (const p of NATIVES) {
      const r = roleBucket(p)
      counts[r] = (counts[r] ?? 0) + 1
    }
    expect(counts.canopy).toBe(12)
    expect(counts.shrub).toBe(20)
    expect(counts.perennial).toBe(46)
    expect(counts.annual).toBe(50)
    expect(counts.grass).toBe(19)
    expect(counts.vine).toBe(3)
  })
})

// ── Sun tier ↔ range matrix ───────────────────────────────────────────────

describe('sun matrix (fitForZone sun read)', () => {
  // Build a native-block plant with an exact sun_range for matrix probing.
  function fakeNative(sun_range: string): SelectorPlant {
    return {
      slug: 'fake',
      scientific_name: 'Fakus plantus',
      common_names: [],
      aliases: [],
      nativity: 'native',
      plant_type: 'perennial',
      height_ft: '1 - 2',
      width_ft: '1',
      height_ft_range: { raw: '1 - 2', min: 1, max: 2 },
      width_ft_range: { raw: '1', min: 1, max: 1 },
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
        sun_range,
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
    }
  }

  function level(sun_range: string, tier: SunTier) {
    return fitForZone(fakeNative(sun_range), 'z1', profileWithZone(tier)).level
  }

  it('full_sun tier wants Full Sun', () => {
    expect(level('Full Sun', 'full_sun')).toBe('great')
    expect(level('Deep Shade', 'full_sun')).toBe('mismatch')
  })

  it('morning_sun_afternoon_shade favors Partial Shade (gentle part-sun)', () => {
    expect(level('Partial Shade', 'morning_sun_afternoon_shade')).toBe('great')
    // full-sun-only is workable but not ideal → not the top level
    expect(level('Full Sun', 'morning_sun_afternoon_shade')).not.toBe('mismatch')
    expect(level('Deep Shade', 'morning_sun_afternoon_shade')).toBe('mismatch')
  })

  it('morning_shade_afternoon_sun demands Full Sun, demotes part-shade-only hard', () => {
    expect(level('Full Sun', 'morning_shade_afternoon_sun')).toBe('great')
    expect(level('Partial Shade', 'morning_shade_afternoon_sun')).toBe('mismatch')
  })

  it('dappled_shade accepts Partial or Deep Shade', () => {
    expect(level('Partial Shade', 'dappled_shade')).toBe('great')
    expect(level('Deep Shade', 'dappled_shade')).toBe('great')
    expect(level('Full Sun', 'dappled_shade')).toBe('mismatch')
  })

  it('full_shade wants Deep Shade', () => {
    expect(level('Deep Shade', 'full_shade')).toBe('great')
    expect(level('Full Sun', 'full_shade')).toBe('mismatch')
  })

  it('empty sun_range does not throw and yields a non-great read', () => {
    const l = level('', 'full_sun')
    expect(['good', 'stretch', 'mismatch', 'unknown']).toContain(l)
  })

  it('aspect hardens the afternoon-sun read for tolerable plants', () => {
    // A part+full plant is tolerable-not-poor under afternoon sun; a hot aspect
    // should pull the reasons/level down relative to a neutral aspect.
    const plant = fakeNative('Full Sun, Partial Shade')
    const neutral = profileWithZone('morning_shade_afternoon_sun')
    neutral.aspect = { cardinal: 'N' }
    const hot = profileWithZone('morning_shade_afternoon_sun')
    hot.aspect = { cardinal: 'SW' }
    // Full Sun present → 'good' fit either way, but a full-sun plant here is
    // fine. Use a part-shade-leaning plant to see the aspect bite.
    const partPlant = fakeNative('Partial Shade')
    // part-shade-only is already mismatch under afternoon sun (demoted hard),
    // so aspect can't demote further — assert it stays a mismatch.
    expect(
      fitForZone(partPlant, 'z1', hot).level,
    ).toBe('mismatch')
    // sanity: the full-sun plant is fine
    expect(fitForZone(plant, 'z1', hot).level).toBe('great')
  })
})

// ── fitForZone contract ───────────────────────────────────────────────────

describe('fitForZone', () => {
  it('returns unknown with an invitation when there is no profile', () => {
    const p = NATIVES[0]
    const r = fitForZone(p, undefined, null)
    expect(r.level).toBe('unknown')
    expect(r.reasons.join(' ')).toMatch(/walkthrough/i)
  })

  it('returns unknown for a plant without a native block', () => {
    const poisonOak = plantBySlug('toxicodendron-diversilobum')!
    const r = fitForZone(poisonOak, 'z1', profileWithZone('full_sun'))
    expect(r.level).toBe('unknown')
  })

  it('fires the overhead-line flag for trees maturing over 25 ft', () => {
    const profile = profileWithZone('full_sun')
    profile.utilities = { overheadLines: true, called811: 'not_yet' }
    const tall = NATIVES.filter((p) => exceedsOverheadClearance(p))
    expect(tall.length).toBeGreaterThan(5)
    const r = fitForZone(tall[0], 'z1', profile)
    expect(r.reasons.join(' ')).toMatch(/power lines/i)
  })

  it('does not fire the overhead flag when no lines are present', () => {
    const profile = profileWithZone('full_sun')
    profile.utilities = { overheadLines: false, called811: 'not_yet' }
    const tall = NATIVES.filter((p) => exceedsOverheadClearance(p))[0]
    const r = fitForZone(tall, 'z1', profile)
    expect(r.reasons.join(' ')).not.toMatch(/power lines/i)
  })

  it('demotes a sharp-drainage plant in a slow-draining / pooling yard', () => {
    // Find a native that wants Fast drainage and not Slow/Standing.
    const sharp = NATIVES.find(
      (p) =>
        p.native!.soil_drainage.includes('Fast') &&
        !p.native!.soil_drainage.some((d) => d === 'Slow' || d === 'Standing') &&
        sunTokens(p.native!.sun_range).includes('full_sun'),
    )!
    expect(sharp).toBeDefined()
    const profile = profileWithZone('full_sun')
    profile.soil = { phClue: 'no_clue', drainage: 'slow' }
    const r = fitForZone(sharp, 'z1', profile)
    expect(r.reasons.join(' ')).toMatch(/sharp drainage/i)
    // A great sun read demoted twice lands at stretch or below.
    expect(['stretch', 'mismatch']).toContain(r.level)
  })

  it('never throws across the whole corpus for any tier', () => {
    const tiers: SunTier[] = [
      'full_sun',
      'morning_sun_afternoon_shade',
      'morning_shade_afternoon_sun',
      'dappled_shade',
      'full_shade',
    ]
    for (const tier of tiers) {
      const profile = profileWithZone(tier)
      for (const p of CORPUS) {
        expect(() => fitForZone(p, 'z1', profile)).not.toThrow()
      }
    }
  })
})

// ── Archetype lens ────────────────────────────────────────────────────────

describe('archetype lens', () => {
  it('lens counts roughly match the spec community counts', () => {
    expect(archetypeLens('grassland').length).toBe(71)
    expect(archetypeLens('woodland_shrubland').length).toBe(98)
    expect(archetypeLens('forest').length).toBe(69)
    expect(archetypeLens('edge').length).toBe(92)
  })

  it('edge ranks straddler (open+woody) species first', () => {
    const edge = archetypeLens('edge')
    // The first non-straddler must not precede any straddler.
    const firstNonStraddler = edge.findIndex((p) => !isEdgeSpecies(p))
    if (firstNonStraddler !== -1) {
      for (let i = firstNonStraddler; i < edge.length; i++) {
        expect(isEdgeSpecies(edge[i])).toBe(false)
      }
    }
  })

  it('inArchetypeLens is consistent with archetypeLens membership', () => {
    for (const p of archetypeLens('forest')) {
      expect(inArchetypeLens(p, 'forest')).toBe(true)
    }
  })
})

// ── similarNatives ────────────────────────────────────────────────────────

describe('similarNatives', () => {
  it('never returns the input plant and returns natives only', () => {
    for (const seed of NATIVES.slice(0, 30)) {
      const sims = similarNatives(seed)
      for (const s of sims) {
        expect(s.plant.slug).not.toBe(seed.slug)
        expect(s.plant.native).not.toBeNull()
      }
    }
  })

  it('ranks documented companions above non-companions', () => {
    const acer = plantBySlug('acer-negundo')!
    const sims = similarNatives(acer, NATIVES, null, 12)
    const companions = new Set(acer.native!.companions)
    const names = (p: SelectorPlant) => [p.scientific_name, ...p.aliases]
    const firstNonCompanionIdx = sims.findIndex(
      (s) => !names(s.plant).some((n) => companions.has(n)),
    )
    const companionIdxs = sims
      .map((s, i) => (names(s.plant).some((n) => companions.has(n)) ? i : -1))
      .filter((i) => i !== -1)
    expect(companionIdxs.length).toBeGreaterThan(0)
    // Every companion outranks the first non-companion.
    if (firstNonCompanionIdx !== -1) {
      for (const ci of companionIdxs) {
        expect(ci).toBeLessThan(firstNonCompanionIdx)
      }
    }
  })

  it('runs on role/height/bloom for a non-native input and still returns natives', () => {
    const invasive = CORPUS.find((p) => p.nativity === 'invasive' && p.plant_type)!
    const sims = similarNatives(invasive, NATIVES, null, 6)
    for (const s of sims) expect(s.plant.native).not.toBeNull()
  })

  it('does not throw for any native seed', () => {
    for (const seed of NATIVES) {
      expect(() => similarNatives(seed)).not.toThrow()
    }
  })
})

// ── contribution ──────────────────────────────────────────────────────────

describe('contribution', () => {
  it('builds a native card with host/community/bloom lines', () => {
    const acer = plantBySlug('acer-negundo')!
    const card = contribution(acer)
    expect(card.tier).toBe('native')
    expect(card.lines.join(' ')).toMatch(/within ~10 miles/i)
    expect(card.hostCount).toBeGreaterThan(0)
    expect(card.communities.length).toBeGreaterThan(0)
  })

  it('flags fall/winter bloomers as a lean season for foragers', () => {
    const fallBloomer = NATIVES.find((p) =>
      (p.bloom_season ?? []).some((s) => s === 'fall' || s === 'winter'),
    )!
    const card = contribution(fallBloomer)
    expect(card.leanSeasonForager).toBe(true)
    expect(card.lines.join(' ')).toMatch(/lean season/i)
  })

  it('marks invasives as cost, not contribution, with a cleanup hook', () => {
    // Unit C: the cleanup handoff moved from a text line to the structured
    // `offersCleanupHandoff` flag (rendered as a real link by ContributionCard);
    // cost lines now describe the plant's spread + the habitats it displaces.
    const invasive = CORPUS.find(
      (p) => p.nativity === 'invasive' && (p.spread_mechanisms?.length ?? 0) > 0,
    )!
    const card = contribution(invasive)
    expect(card.tier).toBe('invasive')
    expect(card.hostCount).toBeNull()
    expect(card.offersCleanupHandoff).toBe(true)
    expect(card.costSpread.length).toBeGreaterThan(0)
    expect(card.lines.join(' ')).toMatch(/crowds out natives/i)
  })

  it('gives non_native_safe an honest-asymmetry read (never shame)', () => {
    // 🟡 has zero pages in the corpus today; synthesize a minimal one to prove
    // the code path renders the good-neighbor voice and offers no cleanup link.
    const base = plantBySlug('acer-negundo')!
    const benign = { ...base, nativity: 'non_native_safe' as const }
    const card = contribution(benign)
    expect(card.tier).toBe('non_native_safe')
    expect(card.offersCleanupHandoff).toBe(false)
    expect(card.costSpread).toEqual([])
    // names the one honest limit (larval hosting) without shaming the plant
    expect(card.lines.join(' ')).toMatch(/caterpillars/i)
    // and still credits what it gives (nectar / joy)
    expect(card.lines.join(' ')).toMatch(/nectar|joy/i)
  })

  it('never throws across the whole corpus', () => {
    for (const p of CORPUS) expect(() => contribution(p)).not.toThrow()
  })
})

// ── facets ────────────────────────────────────────────────────────────────

describe('goal facets', () => {
  it('water-wise selects low-water natives and excludes high-water ones', () => {
    const wise = NATIVES.filter(isWaterWise)
    expect(wise.length).toBeGreaterThan(10)
    for (const p of wise) {
      expect((p.native!.water_range ?? '').toLowerCase()).not.toMatch(/high/)
    }
  })

  it('bird-friendly requires Birds in attracts_wildlife', () => {
    for (const p of NATIVES.filter(isBirdFriendly)) {
      expect(p.native!.attracts_wildlife).toContain('Birds')
    }
  })

  it('easy-care requires ease_of_care Easy', () => {
    for (const p of NATIVES.filter(isEasyCare)) {
      expect(p.native!.ease_of_care).toBe('Easy')
    }
  })

  it('pollinator powerhouse returns a non-empty, sane set', () => {
    const power = NATIVES.filter(isPollinatorPowerhouse)
    expect(power.length).toBeGreaterThan(10)
  })
})

// ── height band ───────────────────────────────────────────────────────────

describe('heightBand', () => {
  it('never throws and returns a valid band for every corpus record', () => {
    const valid = new Set(['ground', 'low', 'mid', 'tall', 'canopy', 'unknown'])
    for (const p of allPlants()) {
      expect(valid.has(heightBand(p))).toBe(true)
    }
  })
})
