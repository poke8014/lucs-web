// Typed load of the derived plant corpus + parsing helpers.
// Pure functions over src/data/plants.json — no React, no storage.

import plantsData from '../../../data/plants.json'
import type { RoleBucket, SelectorPlant, SunToken } from './types'

const ALL = plantsData as unknown as SelectorPlant[]

// Every record.
export function allPlants(): SelectorPlant[] {
  return ALL
}

// Natives that carry a `native:` block — the selector's browse surface.
// (Excludes poison-oak, which is nativity 'native' but has native === null.)
export function nativePlants(): SelectorPlant[] {
  return ALL.filter((p) => p.native !== null)
}

export function plantBySlug(slug: string): SelectorPlant | undefined {
  return ALL.find((p) => p.slug === slug)
}

// ── Sun-range tokenizer ───────────────────────────────────────────────────
// Calscape strings list one or more of "Full Sun" / "Partial Shade" /
// "Deep Shade", comma-separated, in varying order. Unknown tokens fail soft:
// they're dropped and reported via unknownSunTokens() so tests can catch new
// vocabulary rather than silently mis-ranking.

const SUN_MAP: Record<string, SunToken> = {
  'full sun': 'full_sun',
  'partial shade': 'partial_shade',
  'deep shade': 'deep_shade',
}

export function sunTokens(sunRange: string | null | undefined): SunToken[] {
  if (!sunRange) return []
  const out: SunToken[] = []
  for (const part of sunRange.split(',')) {
    const key = part.trim().toLowerCase()
    if (!key) continue
    const tok = SUN_MAP[key]
    if (tok && !out.includes(tok)) out.push(tok)
  }
  return out
}

// Tokens we couldn't map — for test-time surfacing of vocab drift.
export function unknownSunTokens(sunRange: string | null | undefined): string[] {
  if (!sunRange) return []
  const out: string[] = []
  for (const part of sunRange.split(',')) {
    const key = part.trim().toLowerCase()
    if (!key) continue
    if (!SUN_MAP[key]) out.push(part.trim())
  }
  return out
}

// ── Growth role bucket ────────────────────────────────────────────────────
// Derived from the normalized `plant_type` enum. Trees are the "canopy" role
// in selector/bed-planner language.

const ROLE_MAP: Record<string, RoleBucket> = {
  tree: 'canopy',
  shrub: 'shrub',
  perennial: 'perennial',
  annual: 'annual',
  grass: 'grass',
  vine: 'vine',
  groundcover: 'perennial', // schema enum; folds into the perennial role
}

export function roleBucket(plant: SelectorPlant): RoleBucket {
  if (!plant.plant_type) return 'other'
  return ROLE_MAP[plant.plant_type] ?? 'other'
}

// ── Height band ───────────────────────────────────────────────────────────
// Coarse band from the parsed max height, used as a growth-role tiebreaker in
// similarity. Null height → 'unknown' band (never matches, never crashes).

export type HeightBand = 'ground' | 'low' | 'mid' | 'tall' | 'canopy' | 'unknown'

export function heightBand(plant: SelectorPlant): HeightBand {
  const max = plant.height_ft_range?.max
  if (max == null) return 'unknown'
  if (max <= 1) return 'ground'
  if (max <= 3) return 'low'
  if (max <= 8) return 'mid'
  if (max <= 25) return 'tall'
  return 'canopy'
}

// True when the mature height clears the "not under power lines" threshold.
export const OVERHEAD_LINE_HEIGHT_FT = 25

export function exceedsOverheadClearance(plant: SelectorPlant): boolean {
  const max = plant.height_ft_range?.max
  return max != null && max > OVERHEAD_LINE_HEIGHT_FT
}
