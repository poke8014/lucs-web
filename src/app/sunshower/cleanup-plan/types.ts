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

// Closed vocabulary for yard-wide cautions (Layer B summary).
// Each flag maps to a human-readable caution string in plan.ts.
export type SafetyFlag =
  | 'fragment_spreader' // every cut piece can re-root → bag, don't compost/chip loose
  | 'spines_thorns' // physical hazard → thick gloves + eye protection
  | 'irritant_sap' // skin/eye irritation → gloves + long sleeves
  | 'toxic_handling' // toxic to humans/pets → full PPE; don't burn (e.g. poison-hemlock)
  | 'do_not_burn' // burning releases toxic smoke OR cues seedbank germination
  | 'do_not_mow' // mowing fragments and spreads
  | 'allergenic_pollen' // wind-borne pollen / sneeze trigger

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
  // Layer B fields — populated for the 38 annotated plants only.
  // `removal_timing_window` is a short natural-language window
  // ("May–June", "Feb–March", "any cool month") so the summary can
  // cluster plants by when to act. `requires_followup_years` is a
  // single integer used to surface multi-year follow-up cautions
  // (decadal seedbanks etc.). `safety_flags[]` rolls up to yard-wide
  // PPE / disposal cautions. All three fields default to null/empty
  // for plants without removal_method.
  removal_timing_window: string | null
  requires_followup_years: number | null
  safety_flags: SafetyFlag[]
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
