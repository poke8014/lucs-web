// Site-profile data contract — planning/sunshower_site_inventory_mvp.md.
// Versioned; designed to map 1:1 onto a future Supabase `site_profiles` table.

// 5-tier sun vocabulary — vault/concepts/sun-requirements (SummerWinds)
export type SunTier =
  | 'full_sun'
  | 'morning_sun_afternoon_shade'
  | 'morning_shade_afternoon_sun'
  | 'dappled_shade'
  | 'full_shade'

// vault/concepts/landscape-archetypes (Rainer & West)
export type Archetype = 'grassland' | 'woodland_shrubland' | 'forest' | 'edge'

export type Cardinal = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

export type StepId =
  | 'archetype'
  | 'aspect'
  | 'sun_map'
  | 'wind'
  | 'water_slope'
  | 'utilities'
  | 'sightlines'
  | 'soil'

export type StepStatus = 'todo' | 'in_progress' | 'done' | 'skipped'

export interface SunZone {
  id: string          // crypto.randomUUID()
  label: string       // user's name: "back fence bed", "strip by driveway"
  tier: SunTier
  notes?: string
}

export interface Sightline {
  id: string
  kind: 'highlight' | 'disguise' | 'privacy'
  description: string
}

export interface SiteProfile {
  version: 1
  updatedAt: string   // ISO
  steps: Record<StepId, StepStatus>

  archetype?: {
    value: Archetype
    draws?: string     // what pulled you in (free text)
    repels?: string    // what repelled you
  }
  aspect?: {
    bearingDeg?: number     // compass-app reading, back of yard facing out
    cardinal?: Cardinal     // derived from bearingDeg, or entered directly
  }
  sunZones: SunZone[]
  wind?: {
    exposure: 'sheltered' | 'moderate' | 'exposed'
    direction?: Cardinal    // prevailing, if known
    notes?: string
  }
  waterSlope?: {
    grade: 'flat' | 'gentle' | 'steep' | 'mixed'
    poolingSpots?: string   // where rain sits
    hoseReach: 'all' | 'partial' | 'none'
    notes?: string
  }
  utilities?: {
    overheadLines: boolean
    called811: 'done' | 'scheduled' | 'not_yet'
    fixtures?: string       // AC, spigots, meters worth flagging
  }
  sightlines: Sightline[]
  soil?: {
    phClue: 'acid_indicators' | 'alkaline_indicators' | 'no_clue'
    // acid = rhodos/azaleas/camellias thriving nearby; alkaline = lavender/lilac
    drainage?: 'fast' | 'ok' | 'slow'   // optional %-hole or observation
    texture?: 'sandy' | 'loamy' | 'clay' | 'unsure'
    notes?: string
  }
}
