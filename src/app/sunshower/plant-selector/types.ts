// Plant-selector core types (Unit A — data & logic core).
// See planning/sunshower_plant_selector_spec.md. Pure logic only: no React,
// no localStorage, no scoring theater (levels + reasons, never percentages).

// ── The plant shape emitted by ops/build-plant-data.mjs ───────────────────
// Mirrors the JSON in src/data/plants.json. The `native` block is present only
// for native pages that carry a `native:` frontmatter block (poison-oak, a
// native hazard plant, has nativity 'native' but native === null).

export interface DimRange {
  raw: string | null
  min: number | null
  max: number | null
}

export interface NativeBlock {
  communities: string[]
  communities_simplified: string[]
  companions: string[] // scientific binomials
  sun_range: string | null
  water_range: string | null
  soil_drainage: string[]
  ease_of_care: string | null
  nursery_availability: string | null
  is_cultivar: boolean
  butterflies_moths_supported: number | null
  attracts_wildlife: string[]
  soil_ph: string | null
  rarity: string | null
  calscape_url: string | null
}

export interface SelectorPlant {
  slug: string
  scientific_name: string
  common_names: string[]
  aliases: string[]
  nativity: 'native' | 'non_native_safe' | 'invasive' | null
  plant_type: string | null
  height_ft: string | number | null
  width_ft: string | number | null
  height_ft_range: DimRange
  width_ft_range: DimRange
  water: string | null
  sun: string | null
  soil: string[]
  bloom_season: string[]
  pollinators: string[]
  sociability: number | null
  host_plant_for: string[]
  native: NativeBlock | null
  cal_ipc_rating: string | null
}

// ── Fit read (plant ↔ your site) ──────────────────────────────────────────

export type FitLevel = 'great' | 'good' | 'stretch' | 'mismatch' | 'unknown'

export interface FitResult {
  level: FitLevel
  reasons: string[] // human sentences, never scores
}

// ── Sun compatibility ─────────────────────────────────────────────────────
// Calscape's observed vocabulary (enumerated from the corpus 2026-07-05):
// "Full Sun" · "Partial Shade" · "Deep Shade". The spec table's shorthand
// ("Part Shade" / "Full Shade") maps onto these two.

export type SunToken = 'full_sun' | 'partial_shade' | 'deep_shade'

// ── Growth role (plant_type + height band) ────────────────────────────────

export type RoleBucket =
  | 'canopy' // trees
  | 'shrub'
  | 'perennial'
  | 'annual'
  | 'grass'
  | 'vine'
  | 'other'

// ── Similar natives ───────────────────────────────────────────────────────

export interface SimilarResult {
  plant: SelectorPlant
  reasons: string[] // why it's "more like this"
}

// ── Contribution card (plant ↔ your eco-region) ───────────────────────────

export interface ContributionCard {
  tier: 'native' | 'non_native_safe' | 'invasive' | 'unknown'
  hostCount: number | null // butterflies/moths supported
  wildlife: string[] // attracts_wildlife ∪ pollinators
  communities: string[] // communities_simplified
  bloomSeason: string[]
  leanSeasonForager: boolean // blooms fall/winter → forage-gap callout
  nurseryAvailability: string | null
  isCultivar: boolean
  lines: string[] // ready-to-render human sentences
}
