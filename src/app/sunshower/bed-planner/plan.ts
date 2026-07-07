// Shared id helper for the canvas layers (obstruction / path / section / draft
// ids).
//
// The plan *factory* lives in one place — unit A's `createEmptyPlan` in
// useGardenPlans.ts (the persistence layer owns the canonical shape). Unit B's
// workspace carried a second `defaultPlan()` for its local-state prototype; the
// integration pass (unit D) rewired the workspace onto the hook, so that
// duplicate factory (and the yard-size constants that mirrored it) are gone —
// one source of truth. What remains is the id helper every layer imports.

/** crypto.randomUUID where available; a fallback for SSR / older test envs. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
