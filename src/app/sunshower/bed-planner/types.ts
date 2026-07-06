// GardenPlan contract — the bed planner's data model.
//
// Verbatim from planning/sunshower_bed_planner_spec.md §Data contract (signed
// off 2026-07-06); deviations get noted in that doc like the walkthrough's did.
// SunTier imports from the site-inventory types — one vocabulary.
//
// Shaped to serialize into the future Supabase user tables
// (users → yards → sections → section_plants) — see spec §Supabase mapping.

import type { SunTier } from '../site-inventory/types'

export type LayerRole = 'structural' | 'seasonal' | 'groundcover' | 'filler'
// vault/concepts/planting-layers — target shares of total plant quantity:
// structural 10–15%, seasonal 25–40%, groundcover ~50%, filler 5–10%

export type Point = { x: number; y: number } // feet, base-map space, y-down
export type Polygon = Point[] // closed, non-self-intersecting

export interface Obstruction {
  id: string
  kind: 'building' | 'fence' | 'tree' | 'other'
  footprint: Polygon
  heightFt?: number // story presets: 1 ≈ 12 ft, 2 ≈ 22 ft; free override
  deciduous?: boolean // trees only; matters for winter shade in the timelapse
}

export interface BaseMap {
  widthFt: number
  heightFt: number
  imageKey?: string // IndexedDB blob key — satellite/GIS screenshot or photographed paper sketch
  imageOpacity?: number
  pxPerFt?: number // set by scale calibration when an image exists
  northBearingDeg?: number // seeded from SiteProfile.aspect, editable
  boundary?: Polygon // yard outline; defaults to the full rectangle
  obstructions: Obstruction[]
}

export interface PathFeature {
  id: string
  polyline: Point[]
  widthFt: number // default 3
  surface?: 'mulch' | 'gravel' | 'paver' | 'stepping_stones' | 'existing'
}

export type PhaseState = 'untouched' | 'cleanup' | 'prepped' | 'planted' | 'established'

export interface Section {
  id: string
  name: string // "back fence bed"
  polygon: Polygon
  sunZoneId?: string // SiteProfile.sunZones[].id — read-only bridge
  labels: {
    sun?: SunTier // seeded from the linked zone, user-confirmed
    sunSource?: 'stated' | 'simulated' | 'observed'
    // 'stated' = walkthrough label; 'simulated' = accepted timelapse suggestion (unit H);
    // 'observed' reserved for the deferred M2 living-inventory upgrade
    moisture?: 'dry' | 'average' | 'wet' // seeded from waterSlope.poolingSpots prompts
    soilTexture?: 'sandy' | 'loamy' | 'clay' | 'unsure' // seeded from SiteProfile.soil
  }
  densityStyle?: 'landscaped' | 'naturalistic' // per section, not per plan (Luc 2026-07-03)
  phaseState: PhaseState
  plannedSeason?: string // "fall 2026" — CA planting window is roughly Sep–Nov
  holdMethod?: 'cardboard' | 'mulch' | 'none' // suppression while a section waits
}

export type Placement =
  | {
      kind: 'individual'
      id: string
      sectionId: string
      plantSlug: string
      layerRole: LayerRole
      center: Point
    }
  | {
      kind: 'drift'
      id: string
      sectionId: string
      plantSlug: string
      layerRole: LayerRole
      area: Polygon
      count: number // nudge to 3/5/7
    }
  | {
      kind: 'matrixFill'
      id: string
      sectionId: string
      layerRole: LayerRole // groundcover or filler
      mix: { plantSlug: string; sharePct: number }[]
      spacingIn: number // default 12–18" centers
    }
// Quantities are always derivable: individual = 1; drift = count;
// matrixFill = sectionArea(covered) ÷ (spacingIn grid) × sharePct.

export interface Annotation {
  // knowns worth drawing that aren't plants
  id: string
  kind: 'wet_spot' | 'utility' | 'keeper_plant' | 'hose_bib' | 'note'
  geometry: Point | Polygon
  note?: string
}

export interface GardenPlan {
  version: 1
  id: string
  name: string // "v3 — moved the path south"
  createdAt: string
  updatedAt: string
  forkedFrom?: string // one-tap duplication is first-class (bubble-drawing)
  baseMap: BaseMap
  paths: PathFeature[]
  sections: Section[]
  placements: Placement[]
  annotations: Annotation[]
}
