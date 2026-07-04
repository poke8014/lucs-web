import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bearingToCardinal,
  completedStepCount,
  emptyProfile,
  firstUnfinishedStep,
  loadProfile,
  saveProfile,
  STEP_IDS,
  STORAGE_KEY,
} from './profile'

function fakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  }
}

describe('bearingToCardinal', () => {
  it('maps the eight principal bearings', () => {
    expect(bearingToCardinal(0)).toBe('N')
    expect(bearingToCardinal(45)).toBe('NE')
    expect(bearingToCardinal(90)).toBe('E')
    expect(bearingToCardinal(135)).toBe('SE')
    expect(bearingToCardinal(180)).toBe('S')
    expect(bearingToCardinal(225)).toBe('SW')
    expect(bearingToCardinal(270)).toBe('W')
    expect(bearingToCardinal(315)).toBe('NW')
  })

  it('wraps at the sector boundaries', () => {
    expect(bearingToCardinal(360)).toBe('N')
    expect(bearingToCardinal(337.5)).toBe('N') // rounds up into the N sector
    expect(bearingToCardinal(337.4)).toBe('NW')
    expect(bearingToCardinal(22.4)).toBe('N')
    expect(bearingToCardinal(22.5)).toBe('NE')
  })

  it('normalizes out-of-range and negative bearings', () => {
    expect(bearingToCardinal(405)).toBe('NE')
    expect(bearingToCardinal(-45)).toBe('NW')
    expect(bearingToCardinal(-360)).toBe('N')
  })

  it('rejects non-finite input', () => {
    expect(bearingToCardinal(NaN)).toBeNull()
    expect(bearingToCardinal(Infinity)).toBeNull()
  })
})

describe('profile persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeLocalStorage() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips a saved profile', () => {
    const profile = emptyProfile()
    profile.steps.aspect = 'done'
    profile.aspect = { cardinal: 'SW', bearingDeg: 225 }
    saveProfile(profile)
    const loaded = loadProfile()
    expect(loaded.aspect).toEqual({ cardinal: 'SW', bearingDeg: 225 })
    expect(loaded.steps.aspect).toBe('done')
  })

  it('falls back to empty on corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadProfile()).toMatchObject({ version: 1, sunZones: [] })
  })

  it('falls back to empty on an unknown version', () => {
    const future = { ...emptyProfile(), version: 99 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(future))
    expect(loadProfile().version).toBe(1)
    expect(loadProfile().steps.archetype).toBe('todo')
  })

  it('falls back to empty on off-shape data', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 'yes' }))
    expect(loadProfile()).toMatchObject({ version: 1, sightlines: [] })
  })

  it('backfills missing step keys from older saves', () => {
    const saved = emptyProfile()
    // simulate a save from before a hypothetical new step existed
    const steps = { ...saved.steps } as Record<string, string>
    delete steps.soil
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...saved, steps }),
    )
    expect(loadProfile().steps.soil).toBe('todo')
  })

  it('survives storage write failures silently', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
      },
    })
    expect(() => saveProfile(emptyProfile())).not.toThrow()
  })
})

describe('progress helpers', () => {
  it('counts only done steps', () => {
    const profile = emptyProfile()
    profile.steps.archetype = 'done'
    profile.steps.aspect = 'skipped'
    profile.steps.sun_map = 'in_progress'
    expect(completedStepCount(profile)).toBe(1)
  })

  it('resumes at the first step that is neither done nor skipped', () => {
    const profile = emptyProfile()
    profile.steps.archetype = 'done'
    profile.steps.aspect = 'skipped'
    expect(firstUnfinishedStep(profile)).toBe('sun_map')
  })

  it('returns null when every step is done or skipped', () => {
    const profile = emptyProfile()
    for (const id of STEP_IDS) profile.steps[id] = 'done'
    expect(firstUnfinishedStep(profile)).toBeNull()
  })
})
