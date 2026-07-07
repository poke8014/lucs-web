// Checker dismissal memory (unit F). localStorage `sunshower.plannerChecks.v1`,
// keyed by plan id → the set of dismissed finding keys. Same load/parse/save
// discipline as plant-selector/selectorPrefs.ts and site-inventory/profile.ts:
// SSR-safe (empty on the server), versioned, and tolerant of corrupt or
// hand-edited storage (any parse failure falls back to empty).
//
// Why per-plan: dismissals are advice-about-this-plan. A forked plan starts with
// a clean slate (its own id), which is the right default — a variant may have
// fixed the very thing you dismissed on the original.
//
// ANTI-GOAL (mirrors selectorPrefs): this records *which* findings were waved
// off as an unordered set per plan. It never counts, ranks, or shames. The only
// question it answers is boolean: "has the user already dismissed this finding?"

export const STORAGE_KEY = 'sunshower.plannerChecks.v1'

export interface CheckPrefs {
  version: 1
  updatedAt: string
  // planId → dismissed finding keys (stable Finding.key values).
  dismissedByPlan: Record<string, string[]>
}

export function emptyCheckPrefs(): CheckPrefs {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    dismissedByPlan: {},
  }
}

function isCheckPrefsShaped(value: unknown): value is CheckPrefs {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.version !== 'number') return false
  if (typeof v.dismissedByPlan !== 'object' || v.dismissedByPlan === null) return false
  // Every entry must be an array of strings.
  return Object.values(v.dismissedByPlan as Record<string, unknown>).every(
    (keys) => Array.isArray(keys) && keys.every((k) => typeof k === 'string'),
  )
}

export function loadCheckPrefs(): CheckPrefs {
  if (typeof window === 'undefined') return emptyCheckPrefs()
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return emptyCheckPrefs()
  }
  if (!raw) return emptyCheckPrefs()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isCheckPrefsShaped(parsed)) return emptyCheckPrefs()
    if (parsed.version !== 1) return emptyCheckPrefs() // unknown version → empty
    // De-dupe each plan's keys defensively.
    const dismissedByPlan: Record<string, string[]> = {}
    for (const [planId, keys] of Object.entries(parsed.dismissedByPlan)) {
      dismissedByPlan[planId] = [...new Set(keys)]
    }
    return { ...emptyCheckPrefs(), ...parsed, dismissedByPlan }
  } catch {
    return emptyCheckPrefs()
  }
}

export function saveCheckPrefs(prefs: CheckPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }),
    )
  } catch {
    // quota / private-mode — prefs live in memory only for the session.
  }
}

// ── Pure prefs transforms (unit-tested; no storage, no React) ─────────────────

/** The dismissed keys for a plan (empty array when none). */
export function dismissedKeysFor(prefs: CheckPrefs, planId: string): string[] {
  return prefs.dismissedByPlan[planId] ?? []
}

export function isFindingDismissed(
  prefs: CheckPrefs,
  planId: string,
  findingKey: string,
): boolean {
  return dismissedKeysFor(prefs, planId).includes(findingKey)
}

/** Dismiss a finding for a plan. Idempotent; returns the same reference when
 *  nothing changed so callers can skip needless writes. */
export function dismissFinding(
  prefs: CheckPrefs,
  planId: string,
  findingKey: string,
): CheckPrefs {
  const current = prefs.dismissedByPlan[planId] ?? []
  if (current.includes(findingKey)) return prefs
  return {
    ...prefs,
    dismissedByPlan: { ...prefs.dismissedByPlan, [planId]: [...current, findingKey] },
  }
}

/** Undo a dismissal (the panel's "restore" affordance). Idempotent. */
export function restoreFinding(
  prefs: CheckPrefs,
  planId: string,
  findingKey: string,
): CheckPrefs {
  const current = prefs.dismissedByPlan[planId] ?? []
  if (!current.includes(findingKey)) return prefs
  const next = current.filter((k) => k !== findingKey)
  const dismissedByPlan = { ...prefs.dismissedByPlan }
  if (next.length === 0) delete dismissedByPlan[planId]
  else dismissedByPlan[planId] = next
  return { ...prefs, dismissedByPlan }
}
