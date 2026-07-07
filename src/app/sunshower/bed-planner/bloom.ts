// Bloom logic — unit G, module 1.
//
// Season-granular bloom state for placements — feeds the SeasonScrubber badge
// row and the BloomTintLayer. "Bloom scrubbing is season-granular" (spec): the
// corpus carries winter/spring/summer/fall strings, which happen to match H's
// Season type exactly, so the mapping is nearly trivial. We still normalise for
// casing/unknowns and document what we find.
//
// UNMAPPED bloom_season values found in the real corpus (checked 2026-07-06):
//   NONE — the corpus already emits lowercase season tokens ("spring", "summer",
//   "fall", "winter") that are 1:1 with the Season type. The normaliser handles
//   mixed-case variants defensively (e.g. "Spring", "SUMMER") in case future
//   scrapes re-introduce them, but the current 150-native corpus is clean.

import type { Season } from './sun'
import { SEASONS } from './sun'
import type { Placement } from './types'
import type { SelectorPlant } from '../plant-selector/types'

// ── normalizeBloomSeasons ──────────────────────────────────────────────────────

/**
 * Map a plant's `bloom_season` string array onto the canonical Season type.
 * Case-insensitive; unknown tokens are silently dropped (see unmapped note
 * above). Returns deduplicated Season[].
 */
export function normalizeBloomSeasons(plant: SelectorPlant): Season[] {
  if (!plant.bloom_season || plant.bloom_season.length === 0) return []
  const seasonSet = new Set(SEASONS)
  const out: Season[] = []
  for (const raw of plant.bloom_season) {
    const normalized = raw.trim().toLowerCase() as Season
    if (seasonSet.has(normalized) && !out.includes(normalized)) {
      out.push(normalized)
    }
  }
  return out
}

// ── bloomingSlugs ──────────────────────────────────────────────────────────────

/**
 * Set of plantSlugs that are in bloom during `season`.
 * Uses the provided corpus array (not a global import) so callers can subset.
 */
export function bloomingSlugs(corpus: SelectorPlant[], season: Season): Set<string> {
  const out = new Set<string>()
  for (const plant of corpus) {
    if (normalizeBloomSeasons(plant).includes(season)) {
      out.add(plant.slug)
    }
  }
  return out
}

// ── placementBloomState ────────────────────────────────────────────────────────

export type BloomState = 'in_bloom' | 'quiet' | 'partial'

/**
 * Bloom state for a single placement in `season`.
 *
 * - `individual` / `drift` — fully owned by one species: in_bloom or quiet.
 * - `matrixFill` — share-weighted across its mix:
 *     in_bloom  if the share-weighted bloom fraction ≥ 0.5
 *     partial   if any species in the mix is in bloom (but < 0.5)
 *     quiet     if no species is in bloom
 *
 * `bySlug` should be the output of `bloomingSlugs(corpus, season)` for the
 * relevant season. Callers pre-compute it once per season render.
 */
export function placementBloomState(
  placement: Placement,
  season: Season,
  bySlug: Set<string>,
): BloomState {
  if (placement.kind === 'individual' || placement.kind === 'drift') {
    return bySlug.has(placement.plantSlug) ? 'in_bloom' : 'quiet'
  }

  // matrixFill — share-weighted
  const mix = placement.mix
  if (!mix || mix.length === 0) return 'quiet'

  const totalShare = mix.reduce((sum, m) => sum + (m.sharePct > 0 ? m.sharePct : 0), 0)
  if (totalShare <= 0) return 'quiet'

  let bloomingShare = 0
  let anyBlooming = false
  for (const m of mix) {
    if (bySlug.has(m.plantSlug) && m.sharePct > 0) {
      bloomingShare += m.sharePct
      anyBlooming = true
    }
  }

  if (!anyBlooming) return 'quiet'
  const bloomFraction = bloomingShare / totalShare
  return bloomFraction >= 0.5 ? 'in_bloom' : 'partial'
}

// ── bloomSummary ───────────────────────────────────────────────────────────────

/**
 * Per-season count of placements that are in_bloom or partial.
 * "Blooming" means the placement has some bloom presence (in_bloom OR partial).
 * The checker's territory is zero-bloom seasons; we just supply the counts.
 */
export type BloomSummary = Record<Season, { in_bloom: number; partial: number; quiet: number }>

export function bloomSummary(placements: Placement[], corpus: SelectorPlant[]): BloomSummary {
  const summary: BloomSummary = {
    winter: { in_bloom: 0, partial: 0, quiet: 0 },
    spring: { in_bloom: 0, partial: 0, quiet: 0 },
    summer: { in_bloom: 0, partial: 0, quiet: 0 },
    fall: { in_bloom: 0, partial: 0, quiet: 0 },
  }

  for (const season of SEASONS) {
    const slugs = bloomingSlugs(corpus, season)
    for (const placement of placements) {
      const state = placementBloomState(placement, season, slugs)
      summary[season][state]++
    }
  }

  return summary
}

/**
 * Convenience: total "active" placements per season (in_bloom + partial).
 * This is the count the SeasonScrubber badge row displays.
 */
export function bloomCounts(placements: Placement[], corpus: SelectorPlant[]): Record<Season, number> {
  const summary = bloomSummary(placements, corpus)
  const out = {} as Record<Season, number>
  for (const season of SEASONS) {
    out[season] = summary[season].in_bloom + summary[season].partial
  }
  return out
}
