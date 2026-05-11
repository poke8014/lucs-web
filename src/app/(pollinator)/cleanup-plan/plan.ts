import type { CalIpcRating, Plant } from './types'

const RATING_RANK: Record<CalIpcRating, number> = {
  high: 0,
  moderate: 1,
  limited: 2,
  watch: 3,
  alert: 4,
}

const VEGETATIVE_MARKERS = new Set([
  'stolons',
  'rhizomes',
  'fragments',
  'resprouts',
  'vegetative_structures',
])

const SEED_MARKERS = new Set([
  'long_lived_seedbank',
  'extended_seeding',
  'abundant_seed',
  'seeds_annually',
])

const HUMAN_VECTOR_MARKERS = new Set([
  'mowing',
  'dumping',
  'vehicles_equipment',
  'intentional-planting',
  'intentional_planting',
])

export type PlanItem = {
  plant: Plant
  warnings: string[]
  method: string
}

function spreadHas(plant: Plant, set: Set<string>): boolean {
  return plant.spread_mechanisms.some((m) => set.has(m))
}

function methodFor(plant: Plant): string {
  const veg = spreadHas(plant, VEGETATIVE_MARKERS)
  const seed = spreadHas(plant, SEED_MARKERS)
  if (veg && seed) {
    return 'Hand-dig the whole root mass, bag every fragment, then plan a 3+ year follow-up for seedbank germination.'
  }
  if (veg) {
    return 'Hand-dig and bag fragments. Do not mow or compost — both spread the plant.'
  }
  if (seed) {
    return 'Hand-pull or sheet-mulch before seed set. Plan a multi-year follow-up for seedbank germination.'
  }
  return 'Hand-pull or sheet-mulch before flowering.'
}

function warningsFor(plant: Plant): string[] {
  const w: string[] = []
  if (plant.spread_mechanisms.includes('rhizomes')) {
    w.push('Spreads by rhizomes — every fragment can re-root.')
  }
  if (plant.spread_mechanisms.includes('stolons')) {
    w.push('Spreads by stolons — trace each runner before cutting.')
  }
  if (plant.spread_mechanisms.includes('resprouts')) {
    w.push('Resprouts after cutting — flag for repeat visits.')
  }
  if (plant.spread_mechanisms.includes('long_lived_seedbank')) {
    w.push('Long-lived seedbank — plan multi-year follow-up.')
  }
  if (spreadHas(plant, HUMAN_VECTOR_MARKERS)) {
    w.push('Spread by mowing/dumping/vehicles — bag and dispose, do not green-bin.')
  }
  return w
}

function ratingScore(plant: Plant): number {
  return plant.cal_ipc_rating ? RATING_RANK[plant.cal_ipc_rating] : 99
}

function vegetativeFirstScore(plant: Plant): number {
  return spreadHas(plant, VEGETATIVE_MARKERS) ? 0 : 1
}

export function buildPlan(plants: Plant[]): PlanItem[] {
  return [...plants]
    .sort((a, b) => {
      const r = ratingScore(a) - ratingScore(b)
      if (r !== 0) return r
      const v = vegetativeFirstScore(a) - vegetativeFirstScore(b)
      if (v !== 0) return v
      return a.scientific_name.localeCompare(b.scientific_name)
    })
    .map((plant) => ({
      plant,
      warnings: warningsFor(plant),
      method: methodFor(plant),
    }))
}
