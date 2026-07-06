// Goal-facet predicates, built on observed corpus vocabulary. Pure filters the
// batch UI (Unit B) toggles: water-wise, pollinator powerhouse, bird-friendly,
// easy-care, plus a bloom-season helper. See spec §Batches / calscape selector
// model (water-wise / pollinator / bird / low-maintenance).

import type { SelectorPlant } from './types'

// Water-wise: water_range leans Low / Very Low / Extremely Low, no High.
export function isWaterWise(plant: SelectorPlant): boolean {
  const w = plant.native?.water_range
  if (!w) return false
  const tokens = w
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return tokens.some((t) => t.includes('low')) && !tokens.some((t) => t.includes('high'))
}

// Pollinator powerhouse: hosts a meaningful number of leps OR draws the
// pollinator guild broadly. Threshold is a coarse "notably supportive" cut.
const HOST_POWERHOUSE = 25

export function isPollinatorPowerhouse(plant: SelectorPlant): boolean {
  const hosts = plant.native?.butterflies_moths_supported ?? 0
  if (hosts >= HOST_POWERHOUSE) return true
  const wildlife = plant.native?.attracts_wildlife ?? []
  const drawsPollinators =
    wildlife.includes('Bees') ||
    wildlife.includes('Butterflies') ||
    wildlife.includes('Hummingbirds')
  return drawsPollinators && (plant.pollinators?.length ?? 0) >= 2
}

// Bird-friendly: attracts Birds.
export function isBirdFriendly(plant: SelectorPlant): boolean {
  return (plant.native?.attracts_wildlife ?? []).includes('Birds')
}

// Easy-care: Calscape ease_of_care === "Easy".
export function isEasyCare(plant: SelectorPlant): boolean {
  return plant.native?.ease_of_care === 'Easy'
}

// Bloom-season filter helper — matches any of the requested seasons.
export function bloomsIn(plant: SelectorPlant, seasons: string[]): boolean {
  if (seasons.length === 0) return true
  const bloom = plant.bloom_season ?? []
  return seasons.some((s) => bloom.includes(s))
}

export type FacetKey =
  | 'water_wise'
  | 'pollinator_powerhouse'
  | 'bird_friendly'
  | 'easy_care'

const FACET_PREDICATES: Record<FacetKey, (p: SelectorPlant) => boolean> = {
  water_wise: isWaterWise,
  pollinator_powerhouse: isPollinatorPowerhouse,
  bird_friendly: isBirdFriendly,
  easy_care: isEasyCare,
}

// Apply a set of active facet toggles (AND semantics) + optional bloom filter.
export function applyFacets(
  plants: SelectorPlant[],
  facets: FacetKey[],
  bloomSeasons: string[] = [],
): SelectorPlant[] {
  return plants.filter((p) => {
    for (const f of facets) {
      if (!FACET_PREDICATES[f](p)) return false
    }
    return bloomsIn(p, bloomSeasons)
  })
}
