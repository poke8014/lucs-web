// Palette seam — bed-planner adapter.
//
// The bed-planner spec (planning/sunshower_bed_planner_spec.md §"Locked by
// direction…") defines the palette interface as a single seam:
//
//   "section labels in → ranked plant list out"
//
// `fitForZone` is already built here (fit.ts) and drives the selector's per-zone
// ranking. This thin adapter re-exports it under the contract the bed planner
// expects, so the real selector slots in behind the same seam without touching
// the canvas code (spec: "Define the palette as one interface seam (section labels
// in → ranked plant list out) so the real selector slots in without touching the
// canvas code").
//
// The adapter is intentionally thin: no new scoring logic lives here. All
// ranking authority stays in fit.ts + ranking.ts.

import type { SiteProfile } from '../site-inventory/types'
import { nativePlants } from './corpus'
import { fitForZone } from './fit'
import { rankForBrowse } from './ranking'
import type { FitResult, SelectorPlant } from './types'

// ── Types for the bed-planner seam ───────────────────────────────────────────

/**
 * A section's environmental labels — exactly the shape the bed-planner's
 * Section.labels carries, imported here so neither side needs to know about
 * the other's full data contract.
 */
export interface SectionLabels {
  /** SiteProfile.sunZones[].id — links to the user's named sun zone. */
  sunZoneId?: string
  moisture?: 'dry' | 'average' | 'wet'
  soilTexture?: 'sandy' | 'loamy' | 'clay' | 'unsure'
}

/**
 * A single entry in the ranked palette returned to the bed-planner.
 * Includes the plant record and its fit result for the given section.
 */
export interface PaletteEntry {
  plant: SelectorPlant
  fit: FitResult
}

// ── Seam function ─────────────────────────────────────────────────────────────

/**
 * paletteForSection — the palette seam.
 *
 * Given a section's labels and the user's site profile, returns the full
 * native-plant corpus ranked for that section. The bed-planner can then slice
 * the top-N, filter by layer role, or display fit summaries without importing
 * fit.ts directly.
 *
 * @param labels   Section labels (sunZoneId is the primary signal).
 * @param profile  The user's site profile; null → fit level is 'unknown' for
 *                 every plant (browse mode, same as the selector with no profile).
 * @param corpus   Optional override corpus — defaults to all 150 native plants.
 *                 Pass a filtered slice for unit tests.
 *
 * Usage (bed-planner, once its palette unit is built):
 *
 *   import { paletteForSection } from '../plant-selector/paletteSeam'
 *   const ranked = paletteForSection({ sunZoneId: section.sunZoneId }, profile)
 */
export function paletteForSection(
  labels: SectionLabels,
  profile: SiteProfile | null,
  corpus?: SelectorPlant[],
): PaletteEntry[] {
  const plants = corpus ?? nativePlants()

  // rankForBrowse applies profile-aware ranking (fit level → score, communities,
  // companions). We then attach the explicit FitResult for each plant so the
  // bed-planner can render fit summaries without re-running fitForZone.
  const ranked = rankForBrowse(plants, profile, labels.sunZoneId)

  return ranked.map((plant) => ({
    plant,
    fit: fitForZone(plant, labels.sunZoneId, profile),
  }))
}

// Re-export fitForZone directly so the bed-planner can call it on a per-plant
// basis without importing from fit.ts (keeps the dependency surface clean).
export { fitForZone }
