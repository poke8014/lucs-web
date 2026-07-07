// Unit tests for checkPrefs.ts — the pure dismissal-memory transforms and the
// corrupt-tolerant load/save. Mirrors the discipline of selectorPrefs (SSR-safe,
// versioned, tolerant of garbage). No React here — the hook is verified manually.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  STORAGE_KEY,
  dismissFinding,
  dismissedKeysFor,
  emptyCheckPrefs,
  isFindingDismissed,
  loadCheckPrefs,
  restoreFinding,
  saveCheckPrefs,
} from './checkPrefs'

// No jsdom in this repo — stub a minimal window.localStorage per the pattern in
// plant-selector/selector-prefs.test.ts.
function fakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  }
}

// ── Pure transforms ───────────────────────────────────────────────────────────

describe('dismissFinding / restoreFinding', () => {
  it('dismisses a finding key for a plan', () => {
    const p = dismissFinding(emptyCheckPrefs(), 'plan-1', 'bloom_gap:fall')
    expect(isFindingDismissed(p, 'plan-1', 'bloom_gap:fall')).toBe(true)
    expect(dismissedKeysFor(p, 'plan-1')).toEqual(['bloom_gap:fall'])
  })

  it('is idempotent — dismissing twice returns the same reference', () => {
    const p1 = dismissFinding(emptyCheckPrefs(), 'plan-1', 'k')
    const p2 = dismissFinding(p1, 'plan-1', 'k')
    expect(p2).toBe(p1)
  })

  it('scopes dismissals per plan', () => {
    let p = dismissFinding(emptyCheckPrefs(), 'plan-1', 'k')
    p = dismissFinding(p, 'plan-2', 'k')
    expect(isFindingDismissed(p, 'plan-1', 'k')).toBe(true)
    expect(isFindingDismissed(p, 'plan-2', 'k')).toBe(true)
    expect(isFindingDismissed(p, 'plan-3', 'k')).toBe(false)
  })

  it('restores a dismissed finding and cleans up the empty plan entry', () => {
    let p = dismissFinding(emptyCheckPrefs(), 'plan-1', 'k')
    p = restoreFinding(p, 'plan-1', 'k')
    expect(isFindingDismissed(p, 'plan-1', 'k')).toBe(false)
    // The now-empty plan entry is dropped so the store doesn't accrete cruft.
    expect(Object.keys(p.dismissedByPlan)).not.toContain('plan-1')
  })

  it('restoring a non-dismissed key is a no-op (same reference)', () => {
    const p = emptyCheckPrefs()
    expect(restoreFinding(p, 'plan-1', 'k')).toBe(p)
  })

  it('keeps sibling keys when restoring one of several', () => {
    let p = dismissFinding(emptyCheckPrefs(), 'plan-1', 'a')
    p = dismissFinding(p, 'plan-1', 'b')
    p = restoreFinding(p, 'plan-1', 'a')
    expect(dismissedKeysFor(p, 'plan-1')).toEqual(['b'])
  })
})

// ── load/save (localStorage-backed, corrupt-tolerant) ─────────────────────────

describe('loadCheckPrefs / saveCheckPrefs', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeLocalStorage() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns empty prefs when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined)
    expect(loadCheckPrefs()).toEqual(expect.objectContaining({ dismissedByPlan: {} }))
  })

  it('round-trips through localStorage', () => {
    const p = dismissFinding(emptyCheckPrefs(), 'plan-1', 'bloom_gap:fall')
    saveCheckPrefs(p)
    const loaded = loadCheckPrefs()
    expect(isFindingDismissed(loaded, 'plan-1', 'bloom_gap:fall')).toBe(true)
  })

  it('returns empty prefs when nothing is stored', () => {
    expect(loadCheckPrefs().dismissedByPlan).toEqual({})
  })

  it('falls back to empty on corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not valid json')
    expect(loadCheckPrefs().dismissedByPlan).toEqual({})
  })

  it('falls back to empty on wrong shape', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, dismissedByPlan: 'nope' }))
    expect(loadCheckPrefs().dismissedByPlan).toEqual({})
  })

  it('falls back to empty on an unknown version', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, dismissedByPlan: { p: ['k'] } }),
    )
    expect(loadCheckPrefs().dismissedByPlan).toEqual({})
  })

  it('de-dupes keys on load', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, updatedAt: 'x', dismissedByPlan: { p: ['k', 'k', 'k'] } }),
    )
    expect(dismissedKeysFor(loadCheckPrefs(), 'p')).toEqual(['k'])
  })
})
