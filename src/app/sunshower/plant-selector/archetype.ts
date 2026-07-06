// Archetype → community lens. Maps a SiteProfile.archetype onto the
// `communities_simplified` vocabulary to pick the default browse palette.
// See spec §"Archetype → community mapping".
//
// Corpus communities_simplified vocab (enumerated 2026-07-05):
//   Woodland 81 · Chaparral 69 · Forest 69 · Grassland 68 · Wetland/Riparian 64
//   · Coastal Scrub 46 · Desert 13 · Meadow 7
//
// The lens is a default, never a wall (one tap widens to all). Wetland/Riparian
// is NOT archetype-gated — it's triggered by the water story. Desert surfaces
// through the fast-drainage / full-sun path.

import type { Archetype, SiteProfile } from '../site-inventory/types'
import { nativePlants } from './corpus'
import type { SelectorPlant } from './types'

// The communities each archetype leans on.
const ARCHETYPE_LENS: Record<Archetype, string[]> = {
  grassland: ['Grassland', 'Meadow'],
  woodland_shrubland: ['Woodland', 'Chaparral', 'Coastal Scrub'],
  forest: ['Forest'],
  // edge = the transition palette: Woodland ∪ Grassland.
  edge: ['Woodland', 'Grassland'],
}

// For `edge`, plants appearing in *both* an open and a woody community rank
// first — the true transition species.
const EDGE_OPEN = new Set(['Grassland', 'Meadow'])
const EDGE_WOODY = new Set(['Woodland', 'Chaparral', 'Coastal Scrub', 'Forest'])

export function lensCommunities(archetype: Archetype): string[] {
  return ARCHETYPE_LENS[archetype]
}

function communitiesOf(plant: SelectorPlant): string[] {
  return plant.native?.communities_simplified ?? []
}

// True if the plant belongs to any community in the archetype's lens.
export function inArchetypeLens(
  plant: SelectorPlant,
  archetype: Archetype,
): boolean {
  const lens = ARCHETYPE_LENS[archetype]
  const comms = communitiesOf(plant)
  return comms.some((c) => lens.includes(c))
}

// True for edge species that straddle open + woody communities.
export function isEdgeSpecies(plant: SelectorPlant): boolean {
  const comms = communitiesOf(plant)
  const open = comms.some((c) => EDGE_OPEN.has(c))
  const woody = comms.some((c) => EDGE_WOODY.has(c))
  return open && woody
}

// The default browse palette for an archetype: natives in the lens, with
// edge-straddlers ranked first for `edge`. Never filters out — pure ranking
// scaffolding the UI layer (Unit B) can widen.
export function archetypeLens(
  archetype: Archetype,
  plants: SelectorPlant[] = nativePlants(),
): SelectorPlant[] {
  const inLens = plants.filter((p) => inArchetypeLens(p, archetype))
  if (archetype !== 'edge') return inLens
  // For edge, straddlers first, then the rest of the lens.
  return [...inLens].sort((a, b) => {
    const ea = isEdgeSpecies(a) ? 0 : 1
    const eb = isEdgeSpecies(b) ? 0 : 1
    if (ea !== eb) return ea - eb
    return a.scientific_name.localeCompare(b.scientific_name)
  })
}

// Water-story trigger: a wet corner in ANY archetype wants riparian plants.
// Returns Wetland/Riparian members when the profile's water story is wet.
export function wetStoryTriggered(profile: SiteProfile): boolean {
  const wetDrainage = profile.soil?.drainage === 'slow'
  const pooling = Boolean(profile.waterSlope?.poolingSpots?.trim())
  return wetDrainage || pooling
}

export function wetlandRiparian(
  plants: SelectorPlant[] = nativePlants(),
): SelectorPlant[] {
  return plants.filter((p) => communitiesOf(p).includes('Wetland/Riparian'))
}
