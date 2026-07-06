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

// iNaturalist photo record (shape shared with cleanup-plan/types.ts `Photo`).
// Present on every plants.json record but only populated for the invasive set
// today — natives carry [] until an iNat scrape lands, so the UI must render a
// graceful no-photo state (Unit B).
export interface SelectorPhoto {
  url: string
  attribution: string
  license: string
  observation_url: string
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
  // Unit C addition: the invasive `invasive:` block fields the 🔴 contribution
  // card reads to say what a plant costs the region. The JSON already carries
  // these at top level for the invasive set (snake_case tokens); optional so
  // native/test fixtures without them stay valid. See spec §2 (🔴 variant).
  spread_mechanisms?: string[]
  habitat_types?: string[]
  // Unit B addition: iNat photos (only invasives populated today; natives []).
  // Optional so existing Unit A test fixtures don't need the field; the corpus
  // JSON always carries it (possibly empty). UI reads plant.photos?.[0].
  photos?: SelectorPhoto[]
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
  // Unit C additions — the 🔴 cost read. Humanized spread + habitat phrases the
  // card can render as its own styled block (from `spread_mechanisms` /
  // `habitat_types`); `offersCleanupHandoff` gates the warm cleanup-plan link.
  costSpread: string[] // e.g. "long-lived seed bank", "resprouts after cutting"
  costHabitats: string[] // e.g. "riparian woodland", "coastal scrub"
  calIpcRating: string | null // 'high' | 'moderate' | … (raw token; UI labels it)
  offersCleanupHandoff: boolean
}
