// "More like this" — similar natives. Pure + tested. See spec §3.
//
// Similarity axes, in order:
//   shared communities → same growth role (plant_type + height band)
//   → overlapping bloom_season → shared sun/water facets.
// `native.companions` membership boosts strongly ("documented to grow
// together"). Profile, when present, reranks by fit. For non-native / invasive
// input plants (no communities to lean on) it runs on role/height/bloom axes
// only. Always returns natives only, never the input plant.

import type { SiteProfile } from '../site-inventory/types'
import { heightBand, nativePlants, roleBucket, sunTokens } from './corpus'
import { fitForZone } from './fit'
import type { FitLevel, SelectorPlant, SimilarResult } from './types'

function overlap<T>(a: T[], b: T[]): T[] {
  const set = new Set(b)
  return a.filter((x) => set.has(x))
}

// Companion binomials are scientific names; match against candidate names.
function isCompanion(input: SelectorPlant, candidate: SelectorPlant): boolean {
  const companions = input.native?.companions ?? []
  if (companions.length === 0) return false
  const names = [candidate.scientific_name, ...candidate.aliases]
  return companions.some((c) => names.includes(c))
}

// Weights: companion membership dominates, then the ordered axes.
const W_COMPANION = 100
const W_COMMUNITY = 10 // per shared community
const W_ROLE = 6
const W_HEIGHT_BAND = 3
const W_BLOOM = 2 // per shared season
const W_SUN = 1 // per shared sun token
const W_WATER = 1

function waterTokens(plant: SelectorPlant): string[] {
  const w = plant.native?.water_range
  if (!w) return []
  return w
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

interface Scored {
  plant: SelectorPlant
  score: number
  reasons: string[]
  fitLevel: FitLevel | null
}

const FIT_RANK: Record<FitLevel, number> = {
  great: 4,
  good: 3,
  stretch: 2,
  unknown: 1,
  mismatch: 0,
}

export function similarNatives(
  input: SelectorPlant,
  corpus: SelectorPlant[] = nativePlants(),
  profile?: SiteProfile | null,
  limit = 6,
): SimilarResult[] {
  const inputComms = input.native?.communities_simplified ?? []
  const inputRole = roleBucket(input)
  const inputBand = heightBand(input)
  const inputBloom = input.bloom_season ?? []
  const inputSun = sunTokens(input.native?.sun_range)
  const inputWater = waterTokens(input)
  const useCommunities = inputComms.length > 0 // false for 🟡/🔴 picks

  const scored: Scored[] = []
  for (const cand of corpus) {
    if (cand.slug === input.slug) continue // never the input
    if (!cand.native) continue // natives only

    let score = 0
    const reasons: string[] = []

    if (isCompanion(input, cand)) {
      score += W_COMPANION
      reasons.push('Documented to grow alongside it in the wild.')
    }

    if (useCommunities) {
      const shared = overlap(inputComms, cand.native.communities_simplified)
      if (shared.length > 0) {
        score += shared.length * W_COMMUNITY
        reasons.push(`Shares its ${shared.join(' & ')} roots.`)
      }
    }

    if (roleBucket(cand) === inputRole && inputRole !== 'other') {
      score += W_ROLE
      reasons.push('Fills the same role in the garden.')
      if (heightBand(cand) === inputBand && inputBand !== 'unknown') {
        score += W_HEIGHT_BAND
      }
    }

    const bloom = overlap(inputBloom, cand.bloom_season ?? [])
    if (bloom.length > 0) {
      score += bloom.length * W_BLOOM
      reasons.push(`Also blooms in ${bloom.join(' & ')}.`)
    }

    const sun = overlap(inputSun, sunTokens(cand.native.sun_range))
    if (sun.length > 0) score += sun.length * W_SUN
    const water = overlap(inputWater, waterTokens(cand))
    if (water.length > 0) score += water.length * W_WATER

    if (score <= 0) continue

    let fitLevel: FitLevel | null = null
    if (profile) fitLevel = fitForZone(cand, undefined, profile).level

    scored.push({ plant: cand, score, reasons, fitLevel })
  }

  scored.sort((a, b) => {
    // Profile reranks by fit first, then base similarity score.
    if (a.fitLevel && b.fitLevel && a.fitLevel !== b.fitLevel) {
      const d = FIT_RANK[b.fitLevel] - FIT_RANK[a.fitLevel]
      if (d !== 0) return d
    }
    if (a.score !== b.score) return b.score - a.score
    return a.plant.scientific_name.localeCompare(b.plant.scientific_name)
  })

  return scored
    .slice(0, limit)
    .map(({ plant, reasons }) => ({ plant, reasons }))
}
