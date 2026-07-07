import { describe, expect, it } from 'vitest'
import type { Obstruction, Section } from './types'
import { suggestSunTier, tierFromHours } from './sunHours'

// A generously-sized section well away from any obstruction — an open bed.
function openSection(id = 's'): Section {
  return {
    id,
    name: 'open bed',
    polygon: [
      { x: 100, y: 100 },
      { x: 130, y: 100 },
      { x: 130, y: 130 },
      { x: 100, y: 130 },
    ],
    labels: {},
    phaseState: 'untouched',
  }
}

// A tall wall just NORTH of a section — in a north-up map, mid-day shadows fall
// north (away from the section to the south), so this does NOT shade it. To
// shade a section we need the obstruction between it and the sun (to its south).
function wallSouthOf(section: Section, heightFt = 40): Obstruction {
  return {
    id: 'wall',
    kind: 'building',
    heightFt,
    // Big wall spanning the section's x-range, sitting just south (larger y).
    footprint: [
      { x: 80, y: 135 },
      { x: 150, y: 135 },
      { x: 150, y: 145 },
      { x: 80, y: 145 },
    ],
  }
}

describe('tierFromHours — hour thresholds → SunTier', () => {
  it('≥ 6 h growing-season sun ⇒ full_sun', () => {
    expect(tierFromHours(8, 0)).toBe('full_sun')
    expect(tierFromHours(6, -2)).toBe('full_sun')
  })

  it('3–6 h ⇒ a partial-shade tier, split by AM/PM bias', () => {
    expect(tierFromHours(4, 2)).toBe('morning_sun_afternoon_shade') // AM-biased
    expect(tierFromHours(4, -2)).toBe('morning_shade_afternoon_sun') // PM-biased
  })

  it('1.5–3 h ⇒ dappled_shade', () => {
    expect(tierFromHours(2, 0)).toBe('dappled_shade')
  })

  it('< 1.5 h ⇒ full_shade', () => {
    expect(tierFromHours(0.5, 0)).toBe('full_shade')
    expect(tierFromHours(0, 0)).toBe('full_shade')
  })
})

describe('suggestSunTier — open bed vs. shaded bed', () => {
  it('an open section reads full_sun with a low-confidence flag', () => {
    const s = suggestSunTier(openSection(), [], 0)
    expect(s).toBeDefined()
    expect(s!.tier).toBe('full_sun')
    expect(s!.confidence).toBe('low')
  })

  it('reports a sun-hours estimate for every season', () => {
    const s = suggestSunTier(openSection(), [], 0)!
    for (const season of ['winter', 'spring', 'summer', 'fall'] as const) {
      expect(s.sunHoursBySeason[season]).toBeGreaterThan(0)
    }
    // With nothing casting shade, an open bed is lit every daylight hour in every
    // season — the season difference only shows up once an obstruction is in the
    // way (the winter sun is lower, so its shadows reach further). See the wall
    // case below; here we just assert the open bed is fully lit year-round.
    expect(s.sunHoursBySeason.summer).toBe(s.sunHoursBySeason.winter)
  })

  it('winter shadows reach further than summer (the lower winter sun)', () => {
    // A short wall on the sun side casts a longer shadow in winter than summer,
    // so a section behind it keeps more of its summer sun.
    const section = openSection()
    const shaded = suggestSunTier(section, [wallSouthOf(section, 12)], 0)!
    expect(shaded.sunHoursBySeason.summer).toBeGreaterThan(shaded.sunHoursBySeason.winter)
  })

  it('a big wall on the sun side pulls the section toward a shadier tier', () => {
    const section = openSection()
    const open = suggestSunTier(section, [], 0)!
    const shaded = suggestSunTier(section, [wallSouthOf(section)], 0)!
    // The wall to the south blocks mid-day sun ⇒ fewer summer sun-hours.
    expect(shaded.sunHoursBySeason.summer).toBeLessThan(open.sunHoursBySeason.summer)
  })

  it('returns undefined for a degenerate section polygon', () => {
    const bad = { ...openSection(), polygon: [{ x: 0, y: 0 }] }
    expect(suggestSunTier(bad, [], 0)).toBeUndefined()
  })

  it('a deciduous tree does not steal a section its winter sun', () => {
    const section = openSection()
    const decid: Obstruction = {
      id: 't',
      kind: 'tree',
      heightFt: 40,
      deciduous: true,
      footprint: [
        { x: 80, y: 135 },
        { x: 150, y: 135 },
        { x: 150, y: 145 },
        { x: 80, y: 145 },
      ],
    }
    const evergreen: Obstruction = { ...decid, id: 'e', deciduous: false }
    const withDecid = suggestSunTier(section, [decid], 0)!
    const withEvergreen = suggestSunTier(section, [evergreen], 0)!
    // In winter the deciduous tree is bare ⇒ more winter sun than the evergreen.
    expect(withDecid.sunHoursBySeason.winter).toBeGreaterThan(
      withEvergreen.sunHoursBySeason.winter,
    )
  })
})
