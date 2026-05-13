import type { CalIpcRating, Plant, RemovalMethod } from './types'

const RATING_RANK: Record<CalIpcRating, number> = {
  high: 0,
  moderate: 1,
  limited: 2,
  watch: 3,
  alert: 4,
}

// Display labels from vault/synthesis/invasive-removal-methods.md.
// Keep in sync with the RemovalMethod union in ./types.
const METHOD_LABEL: Record<RemovalMethod, string> = {
  hand_pull: 'Hand-pull young plants before seed set',
  dig_taproot: 'Dig out the entire taproot and crown',
  cut_stump_herbicide: 'Cut at base and paint stump with herbicide',
  cane_cut_dig_crown: 'Cut canes, then dig out root crowns',
  pull_vine_dig_crown: 'Sever vines and excavate rooted crowns',
  dig_rhizome_complete: 'Excavate the entire rhizome — bag fragments',
  dig_bulb_complete: 'Dig the entire bulb chain — sift soil',
  sheet_mulch_smother: 'Smother under heavy cardboard and mulch',
  mow_before_seed: 'Mow repeatedly just before seed set',
  solarize_summer: 'Solarize under clear plastic in summer',
}

const UNDOCUMENTED_LABEL = 'Method not yet documented for these plants'

// Fallback caution strings for plants that don't yet have a `removal_method`
// assigned (99 of 137 as of the Agent B rollout). Derived from spread
// mechanisms so the user still gets something concrete to act on.
const HUMAN_VECTOR_MARKERS = new Set([
  'mowing',
  'dumping',
  'vehicles_equipment',
  'intentional-planting',
  'intentional_planting',
])

function fallbackNotes(plant: Plant): string[] {
  const out: string[] = []
  const mechs = plant.spread_mechanisms
  if (mechs.includes('rhizomes')) {
    out.push('Spreads by rhizomes — every fragment can re-root.')
  }
  if (mechs.includes('stolons')) {
    out.push('Spreads by stolons — trace each runner before cutting.')
  }
  if (mechs.includes('resprouts')) {
    out.push('Resprouts after cutting — flag for repeat visits.')
  }
  if (mechs.includes('long_lived_seedbank')) {
    out.push('Long-lived seedbank — plan multi-year follow-up.')
  }
  if (mechs.some((m) => HUMAN_VECTOR_MARKERS.has(m))) {
    out.push('Spread by mowing/dumping/vehicles — bag and dispose, do not green-bin.')
  }
  return out
}

export type PlanPlant = {
  plant: Plant
  notes: string[]
}

export type MethodGroup = {
  method: RemovalMethod | null
  methodLabel: string
  plants: PlanPlant[]
}

function ratingScore(plant: Plant): number {
  return plant.cal_ipc_rating ? RATING_RANK[plant.cal_ipc_rating] : 99
}

function worstRating(plants: Plant[]): number {
  return plants.reduce((min, p) => Math.min(min, ratingScore(p)), 99)
}

export function buildPlan(plants: Plant[]): MethodGroup[] {
  // Bucket plants by removal_method (null lands in a single 'undocumented' bucket).
  const buckets = new Map<RemovalMethod | null, Plant[]>()
  for (const plant of plants) {
    const key = plant.removal_method
    const arr = buckets.get(key)
    if (arr) arr.push(plant)
    else buckets.set(key, [plant])
  }

  const groups: MethodGroup[] = []
  for (const [method, ps] of buckets) {
    const sortedPlants = [...ps].sort((a, b) => {
      const r = ratingScore(a) - ratingScore(b)
      if (r !== 0) return r
      return a.scientific_name.localeCompare(b.scientific_name)
    })
    groups.push({
      method,
      methodLabel: method ? METHOD_LABEL[method] : UNDOCUMENTED_LABEL,
      plants: sortedPlants.map((plant) => ({
        plant,
        notes:
          plant.removal_notes.length > 0
            ? plant.removal_notes
            : fallbackNotes(plant),
      })),
    })
  }

  // Order: worst rating first, then larger groups first, then by method key
  // for determinism. Null method (undocumented) always sinks to the bottom.
  groups.sort((a, b) => {
    if (a.method === null && b.method !== null) return 1
    if (b.method === null && a.method !== null) return -1
    const ra = worstRating(a.plants.map((x) => x.plant))
    const rb = worstRating(b.plants.map((x) => x.plant))
    if (ra !== rb) return ra - rb
    if (a.plants.length !== b.plants.length) return b.plants.length - a.plants.length
    return (a.method ?? '').localeCompare(b.method ?? '')
  })

  return groups
}
