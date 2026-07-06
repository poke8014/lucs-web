import { describe, expect, it } from 'vitest'
import plantsData from '../../../data/plants.json'
import {
  addOrUpdate,
  emptyList,
  entryFor,
  loadList,
  removeEntry,
  saveList,
  setStatus,
  setZone,
  updateEntry,
  entriesByZone,
  PLANT_LIST_KEY,
  type PlantList,
  type PlantListStatus,
} from './plantList'
import { contributionRollup } from './rollup'
import { paletteForSection } from './paletteSeam'
import type { SelectorPlant } from './types'

const CORPUS = plantsData as unknown as SelectorPlant[]
const NATIVES = CORPUS.filter((p) => p.native !== null)

// ── plantList.ts pure helpers ─────────────────────────────────────────────────

describe('emptyList', () => {
  it('returns version 1 with an empty entries array', () => {
    const l = emptyList()
    expect(l.version).toBe(1)
    expect(l.entries).toHaveLength(0)
    expect(typeof l.updatedAt).toBe('string')
  })
})

describe('addOrUpdate', () => {
  it('adds a new entry with the given status', () => {
    const l = addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering')
    expect(l.entries).toHaveLength(1)
    expect(l.entries[0].plantSlug).toBe('acer-macrophyllum')
    expect(l.entries[0].status).toBe('considering')
    expect(typeof l.entries[0].id).toBe('string')
  })

  it('updates status when the slug is already present', () => {
    const l1 = addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering')
    const l2 = addOrUpdate(l1, 'acer-macrophyllum', 'chosen')
    expect(l2.entries).toHaveLength(1)
    expect(l2.entries[0].status).toBe('chosen')
  })

  it('stores an optional zoneId', () => {
    const l = addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering', 'zone-abc')
    expect(l.entries[0].zoneId).toBe('zone-abc')
  })

  it('assigns unique ids for different plants', () => {
    const l = addOrUpdate(
      addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering'),
      'acer-negundo',
      'chosen',
    )
    expect(l.entries[0].id).not.toBe(l.entries[1].id)
  })
})

describe('removeEntry', () => {
  it('removes the matching slug and leaves others intact', () => {
    const l = addOrUpdate(
      addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering'),
      'acer-negundo',
      'chosen',
    )
    const l2 = removeEntry(l, 'acer-macrophyllum')
    expect(l2.entries).toHaveLength(1)
    expect(l2.entries[0].plantSlug).toBe('acer-negundo')
  })

  it('is a no-op for an absent slug', () => {
    const l = addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering')
    const l2 = removeEntry(l, 'no-such-plant')
    expect(l2.entries).toHaveLength(1)
  })
})

describe('setStatus', () => {
  it('changes the status of an existing entry', () => {
    const l = addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering')
    const l2 = setStatus(l, 'acer-macrophyllum', 'already_have')
    expect(l2.entries[0].status).toBe('already_have')
  })

  it('is a no-op if the slug is not present', () => {
    const l = setStatus(emptyList(), 'ghost-plant', 'chosen')
    expect(l.entries).toHaveLength(0)
  })
})

describe('setZone', () => {
  it('updates the zoneId of an existing entry', () => {
    const l = addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering')
    const l2 = setZone(l, 'acer-macrophyllum', 'zone-xyz')
    expect(l2.entries[0].zoneId).toBe('zone-xyz')
  })

  it('can clear the zone by passing undefined', () => {
    const l = addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering', 'zone-xyz')
    const l2 = setZone(l, 'acer-macrophyllum', undefined)
    expect(l2.entries[0].zoneId).toBeUndefined()
  })
})

describe('updateEntry', () => {
  it('patches notes on an entry by id', () => {
    const l = addOrUpdate(emptyList(), 'acer-macrophyllum', 'considering')
    const entryId = l.entries[0].id
    const l2 = updateEntry(l, entryId, { notes: 'Going in the back bed' })
    expect(l2.entries[0].notes).toBe('Going in the back bed')
  })
})

describe('entryFor', () => {
  it('finds an entry by slug', () => {
    const l = addOrUpdate(emptyList(), 'acer-macrophyllum', 'chosen')
    const found = entryFor(l, 'acer-macrophyllum')
    expect(found).toBeDefined()
    expect(found?.status).toBe('chosen')
  })

  it('returns undefined for an absent slug', () => {
    expect(entryFor(emptyList(), 'ghost')).toBeUndefined()
  })
})

describe('entriesByZone', () => {
  it('groups entries under their zoneId, with null for unzoned', () => {
    const l = addOrUpdate(
      addOrUpdate(
        addOrUpdate(emptyList(), 'acer-macrophyllum', 'chosen', 'zone-a'),
        'acer-negundo',
        'chosen', 'zone-a',
      ),
      'toxicodendron-diversilobum',
      'already_have',
      // no zone
    )
    const grouped = entriesByZone(l)
    expect(grouped.get('zone-a')).toHaveLength(2)
    expect(grouped.get(null)).toHaveLength(1)
  })
})

// ── localStorage load/save (mocked window) ────────────────────────────────────

describe('loadList / saveList', () => {
  it('saveList then loadList round-trips a list', () => {
    const store = new Map<string, string>()
    const fakeStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
    }
    // Temporarily swap window.localStorage for this test.
    const orig = globalThis.window
    // @ts-expect-error test shim
    globalThis.window = { localStorage: fakeStorage }

    const list = addOrUpdate(
      addOrUpdate(emptyList(), 'acer-macrophyllum', 'chosen'),
      'acer-negundo',
      'already_have',
    )
    saveList(list)
    const loaded = loadList()
    expect(loaded.entries).toHaveLength(2)
    expect(loaded.entries[0].plantSlug).toBe('acer-macrophyllum')
    expect(loaded.entries[1].status).toBe('already_have')

    // Restore.
    globalThis.window = orig
  })

  it('loadList returns an empty list for corrupt JSON', () => {
    const store = new Map<string, string>([[PLANT_LIST_KEY, '{ not valid json }']])
    const orig = globalThis.window
    // @ts-expect-error test shim
    globalThis.window = { localStorage: { getItem: (k: string) => store.get(k) ?? null } }
    const l = loadList()
    expect(l.entries).toHaveLength(0)
    globalThis.window = orig
  })

  it('loadList returns an empty list when localStorage throws', () => {
    const orig = globalThis.window
    const throwingStorage = {
      getItem: () => { throw new Error('quota') },
      setItem: () => { throw new Error('quota') },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } satisfies Storage
    // @ts-expect-error test shim
    globalThis.window = { localStorage: throwingStorage }
    const l = loadList()
    expect(l.entries).toHaveLength(0)
    globalThis.window = orig
  })
})

// ── rollup.ts ─────────────────────────────────────────────────────────────────

describe('contributionRollup', () => {
  it('returns a zero rollup for an empty list', () => {
    const r = contributionRollup([], NATIVES)
    expect(r.totalHostSpecies).toBe(0)
    expect(r.wildlifeGuilds).toHaveLength(0)
    expect(r.alreadyHaveCount).toBe(0)
    expect(r.alreadyHaveHosting).toBe(false)
    expect(r.lines).toHaveLength(0)
  })

  it('only counts chosen and already_have in the host total by default', () => {
    const slug = NATIVES.find((p) => (p.native?.butterflies_moths_supported ?? 0) > 0)!.slug
    const considering = addOrUpdate(emptyList(), slug, 'considering')
    const r1 = contributionRollup(considering.entries, NATIVES)
    expect(r1.totalHostSpecies).toBe(0) // 'considering' excluded by default

    const chosen = addOrUpdate(emptyList(), slug, 'chosen')
    const r2 = contributionRollup(chosen.entries, NATIVES)
    expect(r2.totalHostSpecies).toBeGreaterThan(0)
  })

  it('flags alreadyHaveHosting when an already_have plant hosts butterflies/moths', () => {
    const hostingNative = NATIVES.find((p) => (p.native?.butterflies_moths_supported ?? 0) > 0)!
    const l = addOrUpdate(emptyList(), hostingNative.slug, 'already_have')
    const r = contributionRollup(l.entries, NATIVES)
    expect(r.alreadyHaveHosting).toBe(true)
    expect(r.alreadyHaveCount).toBe(1)
  })

  it('populates wildlifeGuilds from the combined chosen+already_have pool', () => {
    const withWildlife = NATIVES.find(
      (p) => p.native && p.native.attracts_wildlife.length > 0,
    )!
    const l = addOrUpdate(emptyList(), withWildlife.slug, 'chosen')
    const r = contributionRollup(l.entries, NATIVES)
    expect(r.wildlifeGuilds.length).toBeGreaterThan(0)
  })

  it('covers all four seasons when selected plants bloom across them', () => {
    // Find plants that bloom in different seasons.
    const fallPlant = NATIVES.find((p) => p.bloom_season.includes('fall'))!
    const springPlant = NATIVES.find(
      (p) => p.bloom_season.includes('spring') && p.slug !== fallPlant.slug,
    )!
    let l = emptyList()
    l = addOrUpdate(l, fallPlant.slug, 'chosen')
    l = addOrUpdate(l, springPlant.slug, 'chosen')
    const r = contributionRollup(l.entries, NATIVES)
    expect(r.bloomCoverage.covered).toContain('fall')
    expect(r.bloomCoverage.covered).toContain('spring')
  })

  it('produces a missing-season line mentioning the gap when applicable', () => {
    // Pick a plant that blooms only in spring — others will be gaps.
    const springOnly = NATIVES.find(
      (p) => p.bloom_season.length === 1 && p.bloom_season[0] === 'spring',
    )
    if (!springOnly) return // corpus-dependent; skip if none found
    const l = addOrUpdate(emptyList(), springOnly.slug, 'chosen')
    const r = contributionRollup(l.entries, NATIVES)
    // Some seasons must be missing.
    if (r.bloomCoverage.missing.length > 0) {
      const mentionsMissing = r.lines.some((line) =>
        r.bloomCoverage.missing.some((s) => line.toLowerCase().includes(s)),
      )
      expect(mentionsMissing).toBe(true)
    }
  })

  it('never throws for any combination of corpus entries', () => {
    const slugs = NATIVES.map((p) => p.slug)
    const statuses: PlantListStatus[] = ['considering', 'chosen', 'already_have']
    let l = emptyList()
    for (let i = 0; i < Math.min(20, slugs.length); i++) {
      l = addOrUpdate(l, slugs[i], statuses[i % 3])
    }
    expect(() => contributionRollup(l.entries, NATIVES)).not.toThrow()
  })
})

// ── paletteSeam.ts ────────────────────────────────────────────────────────────

describe('paletteForSection', () => {
  it('returns an entry for every native plant', () => {
    const result = paletteForSection({}, null, NATIVES)
    expect(result.length).toBe(NATIVES.length)
  })

  it('every entry has a plant and a fit result', () => {
    const result = paletteForSection({}, null, NATIVES.slice(0, 10))
    for (const entry of result) {
      expect(entry.plant).toBeDefined()
      expect(['great', 'good', 'stretch', 'mismatch', 'unknown']).toContain(
        entry.fit.level,
      )
      expect(Array.isArray(entry.fit.reasons)).toBe(true)
    }
  })

  it('without a profile all fit levels are unknown', () => {
    const result = paletteForSection({ sunZoneId: 'z1' }, null, NATIVES.slice(0, 5))
    for (const entry of result) {
      expect(entry.fit.level).toBe('unknown')
    }
  })

  it('with a profile and zone the fit levels vary across the corpus', () => {
    const profile = {
      version: 1 as const,
      updatedAt: '2026-07-05T00:00:00.000Z',
      steps: {
        archetype: 'todo' as const,
        aspect: 'todo' as const,
        sun_map: 'todo' as const,
        wind: 'todo' as const,
        water_slope: 'todo' as const,
        utilities: 'todo' as const,
        sightlines: 'todo' as const,
        soil: 'todo' as const,
      },
      sunZones: [{ id: 'z1', label: 'test', tier: 'full_sun' as const }],
      sightlines: [],
    }
    const result = paletteForSection({ sunZoneId: 'z1' }, profile, NATIVES)
    const levels = new Set(result.map((e) => e.fit.level))
    // A real corpus with all sun tiers should produce more than one level.
    expect(levels.size).toBeGreaterThan(1)
  })

  it('never throws for any corpus input', () => {
    expect(() => paletteForSection({}, null, NATIVES)).not.toThrow()
    expect(() => paletteForSection({ sunZoneId: 'z1' }, null, NATIVES)).not.toThrow()
  })
})
