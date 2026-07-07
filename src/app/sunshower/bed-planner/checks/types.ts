// Plan-checker types (unit F).
//
// The checker is advisory-only: pure functions over
// (GardenPlan, SiteProfile | null, SelectorPlant[]) → Finding[]. Nothing here
// blocks saving, sharing, or planting — every finding is an invitation the user
// can act on or dismiss (spec §"The plan checker": "Advisory, dismissible…
// Nothing blocks saving, sharing, or planting").

/** The 13 rules from the spec table, as stable ids used for grouping + copy. */
export type RuleId =
  | 'bare_ground'
  | 'bloom_gap'
  | 'height_inversion'
  | 'lonely_drift'
  | 'no_repetition'
  | 'no_grasses'
  | 'crowding'
  | 'too_big'
  | 'sun_water_mismatch'
  | 'sightline_conflict'
  | 'utility_conflict'
  | 'unreachable_depth'
  | 'phase_order'

/**
 * Two-tier severity, matching the spec table's icons:
 *   'suggestion'   → 💡 a gentle nudge ("want something blooming in fall?")
 *   'worth_a_look' → ⚠️ something that could bite ("a 6-ft shrub in a 4-ft bed")
 * Neither ever blocks; the icons only sort the panel's attention.
 */
export type Severity = 'suggestion' | 'worth_a_look'

/**
 * One checker finding. `key` is the dismissal identity — it must be stable
 * across recomputation for the same underlying issue so a dismissal sticks
 * (checkPrefs.ts keys off it). Keys are derived from (ruleId + the ids of the
 * plan entities the finding is about), never from array order or a counter.
 */
export interface Finding {
  /** Stable across recomputation — the dismissal identity. */
  key: string
  ruleId: RuleId
  severity: Severity
  /** Present when the finding is about a specific section (panel grouping). */
  sectionId?: string
  /** Present when the finding is about a specific placement. */
  placementId?: string
  /** Friendly, invitation-not-scold (spec §copy tone). */
  message: string
  /** One-sentence rationale for the "why this matters" expandable. */
  why: string
  /** Vault page name for provenance — plain text, not a link (e.g. "planting-layers"). */
  anchor: string
}
