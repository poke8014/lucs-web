// Bed-planner palette — interim picker over the selector seam.
//
// The spec (planning/sunshower_bed_planner_spec.md §"Locked by direction") says:
//   "Define the palette as one interface seam (section labels in → ranked plant
//   list out) so the real selector slots in without touching the canvas code."
//
// This module wraps `paletteForSection` from the plant-selector's paletteSeam,
// extends it with bed-planner section labels (moisture + soilTexture), and
// attaches a `suggestPlacement` result to each entry. It also exports
// `plantFirstLookup` for the plant-first on-ramp.
//
// Down-ranking vs. hiding: moisture/soil mismatches are soft signals — the
// plan checker (unit F) catches hard mismatches. Here we down-rank and expose a
// `labelMismatch` flag so the panel can show a note ("works best in drier
// spots") without hiding the plant. The user might know something we don't.

import type { SiteProfile } from '../site-inventory/types'
import {
  paletteForSection,
  fitForZone,
  type SectionLabels as SeamLabels,
  type PaletteEntry,
} from '../plant-selector/paletteSeam'
import { searchCorpus } from '../plant-selector/search'
import type { FitLevel, SelectorPlant } from '../plant-selector/types'
import { suggestPlacement, type PlacementSuggestion } from './layerRole'

// ── Extended section labels (bed-planner adds moisture + soilTexture) ─────────

export interface BedSectionLabels extends SeamLabels {
  moisture?: 'dry' | 'average' | 'wet'
  soilTexture?: 'sandy' | 'loamy' | 'clay' | 'unsure'
}

// ── Bed palette entry — PaletteEntry + placement suggestion + mismatch flag ──

export interface BedPaletteEntry {
  plant: SelectorPlant
  fit: { level: FitLevel; reasons: string[] }
  suggestion: PlacementSuggestion
  /** Non-empty when this plant was down-ranked due to section label mismatch. */
  labelMismatch?: string[]
}

// ── Moisture / drainage compatibility helpers ─────────────────────────────────
// These intentionally mirror the logic in fit.ts (wantsSharpDrainage,
// toleratesWetFeet, isDryLoving, isWetLoving) but read from the section's
// moisture label rather than the SiteProfile's drainage field.

function tokenizeWaterRange(range: string | null | undefined): string[] {
  if (!range) return []
  return range
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function isDryLoving(plant: SelectorPlant): boolean {
  const w = tokenizeWaterRange(plant.native?.water_range ?? null)
  return w.some((x) => x.includes('low')) && !w.some((x) => x.includes('high'))
}

function isWetLoving(plant: SelectorPlant): boolean {
  const w = tokenizeWaterRange(plant.native?.water_range ?? null)
  return w.includes('high')
}

function wantsSharpDrainage(plant: SelectorPlant): boolean {
  const d = plant.native?.soil_drainage ?? []
  return d.includes('Fast') && !d.some((x) => x === 'Slow' || x === 'Standing')
}

function toleratesWetSoil(plant: SelectorPlant): boolean {
  const d = plant.native?.soil_drainage ?? []
  return d.includes('Slow') || d.includes('Standing')
}

// Returns mismatches as human-readable strings, empty array if none.
function moistureMismatches(
  plant: SelectorPlant,
  moisture: 'dry' | 'average' | 'wet' | undefined,
  soilTexture: 'sandy' | 'loamy' | 'clay' | 'unsure' | undefined,
): string[] {
  const mismatches: string[] = []

  if (moisture === 'dry') {
    if (isWetLoving(plant)) {
      mismatches.push('Prefers more water than this dry section will get.')
    }
    if (toleratesWetSoil(plant) && !isDryLoving(plant)) {
      mismatches.push('Likes its feet damp — may struggle in a dry spot.')
    }
  }

  if (moisture === 'wet') {
    if (isDryLoving(plant) || wantsSharpDrainage(plant)) {
      mismatches.push('Prefers dry, fast-draining conditions — soggy soil will stress it.')
    }
  }

  // Soil texture: clay drainage is slow; sandy is fast.
  if (soilTexture === 'sandy' && isWetLoving(plant)) {
    mismatches.push('Wants steady moisture — sandy soil drains too quickly.')
  }
  if (soilTexture === 'clay' && wantsSharpDrainage(plant)) {
    mismatches.push('Needs fast drainage — clay soil holds too much water.')
  }

  return mismatches
}

// ── Core palette function ─────────────────────────────────────────────────────

/**
 * paletteForBedSection — ranked plant list for the active section.
 *
 * Wraps `paletteForSection` (the seam) with:
 *   - moisture + soilTexture soft-filtering: mismatched plants are down-ranked
 *     rather than hidden; each entry carries a `labelMismatch` flag the UI renders
 *   - `suggestion` attached to every entry from `suggestPlacement`
 *
 * Plants with label mismatches sort to the end of the list (after the ranked
 * fit tiers). Within the mismatch group they keep their fit-relative order —
 * the checker will surface hard mismatches; this is just a visual nudge.
 *
 * @param labels  Section's environmental labels (superset of the seam's labels).
 * @param profile User's site profile; null → 'unknown' fit for all plants.
 * @param opts    Optional override corpus (unit-test hook).
 */
export function paletteForBedSection(
  labels: BedSectionLabels,
  profile: SiteProfile | null,
  opts?: { corpus?: SelectorPlant[] },
): BedPaletteEntry[] {
  // Get the base ranked list from the seam (sun-zone aware, fit-ranked).
  const seamEntries: PaletteEntry[] = paletteForSection(
    { sunZoneId: labels.sunZoneId },
    profile,
    opts?.corpus,
  )

  const { moisture, soilTexture } = labels

  const good: BedPaletteEntry[] = []
  const flagged: BedPaletteEntry[] = []

  for (const entry of seamEntries) {
    const mismatch = moistureMismatches(entry.plant, moisture, soilTexture)
    const bedEntry: BedPaletteEntry = {
      plant: entry.plant,
      fit: entry.fit,
      suggestion: suggestPlacement(entry.plant),
      ...(mismatch.length > 0 ? { labelMismatch: mismatch } : {}),
    }

    if (mismatch.length > 0) {
      flagged.push(bedEntry)
    } else {
      good.push(bedEntry)
    }
  }

  // Good-fit plants first, then down-ranked label-mismatch plants.
  return [...good, ...flagged]
}

// ── Plant-first on-ramp ───────────────────────────────────────────────────────

export interface PlantFirstResult {
  plant: SelectorPlant
  fit: { level: FitLevel; reasons: string[] }
  suggestion: PlacementSuggestion
  labelMismatch?: string[]
  matchedOn: string
}

/**
 * plantFirstLookup — search by name, return the plant + a fit read for the
 * given section labels.
 *
 * This is the "I already know what I want" on-ramp (spec §"Locked by direction":
 * "plant-first entry — type a plant you've fallen for, get a fit read against
 * the section you're pointing at"). Guidance is never a gate — even a mismatch
 * returns a result.
 *
 * @param query  Free-text search (scientific name, common name, alias).
 * @param labels Section labels for the fit read.
 * @param profile User's site profile; null → fit level 'unknown'.
 * @param limit  Max results (default 12, matches search.ts default).
 */
export function plantFirstLookup(
  query: string,
  labels: BedSectionLabels,
  profile: SiteProfile | null,
  limit = 12,
): PlantFirstResult[] {
  const hits = searchCorpus(query, limit)
  if (hits.length === 0) return []

  const { moisture, soilTexture } = labels

  return hits.map(({ plant, matchedOn }) => {
    const fit = fitForZone(plant, labels.sunZoneId, profile)
    const mismatch = moistureMismatches(plant, moisture, soilTexture)

    return {
      plant,
      fit,
      suggestion: suggestPlacement(plant),
      ...(mismatch.length > 0 ? { labelMismatch: mismatch } : {}),
      matchedOn,
    }
  })
}
