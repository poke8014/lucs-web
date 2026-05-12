export type CalIpcRating = 'high' | 'moderate' | 'limited' | 'watch' | 'alert'

export type Photo = {
  url: string
  attribution: string
  license: string
  observation_url: string
}

export type RemovalMethod =
  | 'hand_pull'
  | 'dig_taproot'
  | 'cut_stump_herbicide'
  | 'cane_cut_dig_crown'
  | 'pull_vine_dig_crown'
  | 'dig_rhizome_complete'
  | 'dig_bulb_complete'
  | 'sheet_mulch_smother'
  | 'mow_before_seed'
  | 'solarize_summer'

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
  removal_method: RemovalMethod | null
  removal_notes: string[]
  removal_sources: string[]
}

export type Match = {
  plant: Plant
  confidence: 'exact' | 'partial' | 'fuzzy'
  matchedOn: string
}

export type Pick = {
  slug: string
  matchedOn: string
}

export type ResolvedRow = {
  id: string
  rawInput: string
  candidates: Match[]
  selectedSlug: string | null
  status: 'unresolved' | 'kept' | 'dropped'
}
