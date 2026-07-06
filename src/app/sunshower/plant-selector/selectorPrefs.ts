// Selector preferences — the dismissal memory that makes the native-swap nudge
// a one-time offer, not a nag (spec Decision ⚠️3, §"The selection philosophy"
// rule 4). localStorage `sunshower.selectorPrefs.v1`, versioned and forward-safe
// on the same load/parse/save discipline as site-inventory/profile.ts (graceful
// fallback when localStorage is corrupt, versioned, or unavailable).
//
// ANTI-GOAL (spec §Anti-goals): this records *which* plants had their swap shelf
// dismissed, as an unordered set. It never counts dismissals, never exposes a
// total, never ranks or shames. The only question it answers is boolean:
// "has the user already waved off suggestions for this plant?" A dismissed
// suggestion stays dismissed.

export const STORAGE_KEY = 'sunshower.selectorPrefs.v1'

export interface SelectorPrefs {
  version: 1
  updatedAt: string
  // Plant slugs whose "similar natives" swap shelf the user has dismissed.
  // A Set would be tidier in memory but JSON needs an array; we de-dupe on write.
  dismissedSuggestions: string[]
}

export function emptyPrefs(): SelectorPrefs {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    dismissedSuggestions: [],
  }
}

function isPrefsShaped(value: unknown): value is SelectorPrefs {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.version === 'number' &&
    Array.isArray(v.dismissedSuggestions) &&
    v.dismissedSuggestions.every((s) => typeof s === 'string')
  )
}

export function loadPrefs(): SelectorPrefs {
  if (typeof window === 'undefined') return emptyPrefs()
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return emptyPrefs()
  }
  if (!raw) return emptyPrefs()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isPrefsShaped(parsed)) return emptyPrefs()
    // version gates future migrations; unknown versions fall back to empty.
    if (parsed.version !== 1) return emptyPrefs()
    return {
      ...emptyPrefs(),
      ...parsed,
      // de-dupe defensively — an older/hand-edited save could carry repeats.
      dismissedSuggestions: [...new Set(parsed.dismissedSuggestions)],
    }
  } catch {
    return emptyPrefs()
  }
}

export function savePrefs(prefs: SelectorPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }),
    )
  } catch {
    // quota exceeded / private-mode restrictions — prefs live in memory only.
  }
}

// ── Pure prefs transforms (unit-tested; no storage, no React) ───────────────

export function isDismissed(prefs: SelectorPrefs, plantSlug: string): boolean {
  return prefs.dismissedSuggestions.includes(plantSlug)
}

/** Add a slug's swap shelf to the dismissed set. Idempotent (never duplicates,
 *  never "counts"). Returns the same reference when nothing changed so callers
 *  can skip needless writes. */
export function dismissSuggestions(
  prefs: SelectorPrefs,
  plantSlug: string,
): SelectorPrefs {
  if (prefs.dismissedSuggestions.includes(plantSlug)) return prefs
  return {
    ...prefs,
    dismissedSuggestions: [...prefs.dismissedSuggestions, plantSlug],
  }
}

/** Undo a dismissal (e.g. an in-session "show them anyway" affordance). */
export function restoreSuggestions(
  prefs: SelectorPrefs,
  plantSlug: string,
): SelectorPrefs {
  if (!prefs.dismissedSuggestions.includes(plantSlug)) return prefs
  return {
    ...prefs,
    dismissedSuggestions: prefs.dismissedSuggestions.filter((s) => s !== plantSlug),
  }
}
