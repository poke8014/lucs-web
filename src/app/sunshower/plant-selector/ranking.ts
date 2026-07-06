// Batch ranking for the browse surface. Natives only (the nudge = centering
// natives). Ranks the candidates for one growth role within the active lens.
// Pure — the UI (SelectorClient) supplies the active zone / communities /
// facets and slices reroll windows off the top of the returned ranked list.
//
// Ranking rule (spec §Batches):
//   • profile + zone present → fitForZone level (great > good > stretch >
//     mismatch > unknown), then butterflies/moths hosted, then name.
//   • otherwise → lens membership already applied by the caller; rank by host
//     count then name (butterflies/moths is the ecological headline).

import type { SiteProfile } from '../site-inventory/types'
import { roleBucket } from './corpus'
import { fitForZone } from './fit'
import type { FitLevel, RoleBucket, SelectorPlant } from './types'

const FIT_RANK: Record<FitLevel, number> = {
  great: 4,
  good: 3,
  stretch: 2,
  unknown: 1,
  mismatch: 0,
}

function hostCount(p: SelectorPlant): number {
  return p.native?.butterflies_moths_supported ?? 0
}

// Rank a pool of natives for browsing. When profile + zoneId are given, fit
// leads; otherwise host count leads. Stable, deterministic (no shuffle) so the
// reroll windows below cycle predictably rather than reshuffling chaos.
export function rankForBrowse(
  pool: SelectorPlant[],
  profile: SiteProfile | null,
  zoneId: string | undefined,
): SelectorPlant[] {
  const useFit = Boolean(profile && zoneId)
  const fitCache = new Map<string, FitLevel>()
  if (useFit) {
    for (const p of pool) {
      fitCache.set(p.slug, fitForZone(p, zoneId, profile).level)
    }
  }
  return [...pool].sort((a, b) => {
    if (useFit) {
      const fa = FIT_RANK[fitCache.get(a.slug) ?? 'unknown']
      const fb = FIT_RANK[fitCache.get(b.slug) ?? 'unknown']
      if (fa !== fb) return fb - fa
    }
    const ha = hostCount(a)
    const hb = hostCount(b)
    if (ha !== hb) return hb - ha
    return a.scientific_name.localeCompare(b.scientific_name)
  })
}

// Split a ranked pool into fixed reroll windows of `size`. "Show me different
// ones" advances the window index (wrapping); the last window pads back to the
// front so it's always full when the pool is larger than one window.
export function batchWindow(
  ranked: SelectorPlant[],
  windowIndex: number,
  size = 6,
): SelectorPlant[] {
  if (ranked.length === 0) return []
  if (ranked.length <= size) return ranked
  const windowCount = Math.ceil(ranked.length / size)
  const idx = ((windowIndex % windowCount) + windowCount) % windowCount
  const start = idx * size
  const slice = ranked.slice(start, start + size)
  if (slice.length < size) {
    // Last, short window — pad from the front so the batch stays full.
    return [...slice, ...ranked.slice(0, size - slice.length)]
  }
  return slice
}

export function windowCountFor(poolLength: number, size = 6): number {
  if (poolLength <= size) return 1
  return Math.ceil(poolLength / size)
}

// Group a pool of natives by growth role, preserving the ranked order within
// each role. Returns entries in the canonical role order.
export const ROLE_ORDER: RoleBucket[] = [
  'canopy',
  'shrub',
  'perennial',
  'annual',
  'grass',
  'vine',
]

export const ROLE_LABEL: Record<RoleBucket, string> = {
  canopy: 'Trees & canopy',
  shrub: 'Shrubs',
  perennial: 'Perennials',
  annual: 'Annuals',
  grass: 'Grasses',
  vine: 'Vines',
  other: 'Other',
}

export function groupByRole(
  plants: SelectorPlant[],
): { role: RoleBucket; plants: SelectorPlant[] }[] {
  const byRole = new Map<RoleBucket, SelectorPlant[]>()
  for (const p of plants) {
    const r = roleBucket(p)
    if (r === 'other') continue
    const arr = byRole.get(r) ?? []
    arr.push(p)
    byRole.set(r, arr)
  }
  return ROLE_ORDER.map((role) => ({
    role,
    plants: byRole.get(role) ?? [],
  })).filter((g) => g.plants.length > 0)
}
