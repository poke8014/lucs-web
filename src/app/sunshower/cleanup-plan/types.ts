export type CalIpcRating = 'high' | 'moderate' | 'limited' | 'watch' | 'alert'

export type Photo = {
  url: string
  attribution: string
  license: string
  observation_url: string
}

export type Plant = {
  slug: string
  scientific_name: string
  common_names: string[]
  aliases: string[]
  nativity: 'native' | 'non_native_safe' | 'invasive' | null
  plant_type: string | null
  height_ft: number | null
  width_ft: number | null
  water: string | null
  sun: string | null
  cal_ipc_rating: CalIpcRating | null
  cdfa_rating: string | null
  impact_score: string | null
  invasiveness_score: string | null
  distribution_score: string | null
  spread_mechanisms: string[]
  habitat_types: string[]
  jepson_regions: string[]
  photos: Photo[]
}

export type Match = {
  plant: Plant
  confidence: 'exact' | 'partial' | 'fuzzy'
  matchedOn: string
}

export type ResolvedRow = {
  id: string
  rawInput: string
  candidates: Match[]
  selectedSlug: string | null
  status: 'unresolved' | 'kept' | 'dropped'
}
