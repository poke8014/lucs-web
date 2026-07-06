import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissSuggestions,
  emptyPrefs,
  isDismissed,
  loadPrefs,
  restoreSuggestions,
  savePrefs,
  STORAGE_KEY,
} from './selectorPrefs'

function fakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  }
}

describe('dismissal transforms (pure)', () => {
  it('starts with nothing dismissed', () => {
    const prefs = emptyPrefs()
    expect(prefs.dismissedSuggestions).toEqual([])
    expect(isDismissed(prefs, 'lavandula')).toBe(false)
  })

  it('remembers a dismissed plant', () => {
    const prefs = dismissSuggestions(emptyPrefs(), 'lavandula')
    expect(isDismissed(prefs, 'lavandula')).toBe(true)
    expect(isDismissed(prefs, 'rosmarinus')).toBe(false)
  })

  it('is idempotent — dismissing twice never duplicates or counts', () => {
    let prefs = dismissSuggestions(emptyPrefs(), 'lavandula')
    const before = prefs
    prefs = dismissSuggestions(prefs, 'lavandula')
    // same reference back (no needless write) and still a single entry
    expect(prefs).toBe(before)
    expect(prefs.dismissedSuggestions).toEqual(['lavandula'])
  })

  it('tracks multiple plants independently', () => {
    let prefs = emptyPrefs()
    prefs = dismissSuggestions(prefs, 'lavandula')
    prefs = dismissSuggestions(prefs, 'rosmarinus')
    expect(isDismissed(prefs, 'lavandula')).toBe(true)
    expect(isDismissed(prefs, 'rosmarinus')).toBe(true)
    expect(prefs.dismissedSuggestions).toHaveLength(2)
  })

  it('restores a dismissed plant', () => {
    let prefs = dismissSuggestions(emptyPrefs(), 'lavandula')
    prefs = restoreSuggestions(prefs, 'lavandula')
    expect(isDismissed(prefs, 'lavandula')).toBe(false)
  })

  it('restore is a no-op (same ref) when nothing was dismissed', () => {
    const prefs = emptyPrefs()
    expect(restoreSuggestions(prefs, 'lavandula')).toBe(prefs)
  })
})

describe('prefs persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeLocalStorage() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips dismissed suggestions', () => {
    let prefs = emptyPrefs()
    prefs = dismissSuggestions(prefs, 'lavandula')
    prefs = dismissSuggestions(prefs, 'rosmarinus')
    savePrefs(prefs)
    const loaded = loadPrefs()
    expect(loaded.dismissedSuggestions.sort()).toEqual(['lavandula', 'rosmarinus'])
  })

  it('falls back to empty on corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadPrefs()).toMatchObject({ version: 1, dismissedSuggestions: [] })
  })

  it('falls back to empty on an unknown version', () => {
    const future = { ...emptyPrefs(), version: 99 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(future))
    expect(loadPrefs().version).toBe(1)
    expect(loadPrefs().dismissedSuggestions).toEqual([])
  })

  it('falls back to empty on off-shape data', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 'yes' }))
    expect(loadPrefs()).toMatchObject({ version: 1, dismissedSuggestions: [] })
  })

  it('rejects a non-string entry in the dismissed array', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, updatedAt: 'x', dismissedSuggestions: ['ok', 3] }),
    )
    expect(loadPrefs().dismissedSuggestions).toEqual([])
  })

  it('de-dupes repeats from a hand-edited save', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: 'x',
        dismissedSuggestions: ['lavandula', 'lavandula', 'rosmarinus'],
      }),
    )
    expect(loadPrefs().dismissedSuggestions.sort()).toEqual(['lavandula', 'rosmarinus'])
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
    expect(() => savePrefs(emptyPrefs())).not.toThrow()
  })

  it('returns empty prefs when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined)
    expect(loadPrefs()).toMatchObject({ version: 1, dismissedSuggestions: [] })
    expect(() => savePrefs(emptyPrefs())).not.toThrow()
  })
})
