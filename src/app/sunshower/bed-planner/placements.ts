// Placement quantity + layer-share math — the pure logic behind flow step 4.
//
// The four-layer model (types.ts LayerRole comment, vault/concepts/planting-layers)
// only becomes *checkable* once quantities are derivable from placements. The
// three placement kinds each answer "how many plants is this?" differently:
//
//   individual — one plant, one point                  → 1
//   drift      — one species, a small polygon, a count → count (the traced count)
//   matrixFill — a species mix over a region at spacing → grid count × sharePct
//
// This module is framework-free and unit-tested; the components in PlantStep.tsx
// / PlacementLayer read off it. Spacing/footprint constants come from estimate.ts
// so the placement-based refinement and the area-based estimate speak one
// vocabulary (spec §Spacing & quantity math).

import type { LayerRole, Placement, Point, Section } from './types'
import type { SelectorPlant } from '../plant-selector/types'
import { polygonArea } from './geometry'
import { LANDSCAPED_CLEARANCE_FT } from './estimate'

// ── Drift count suggestion ────────────────────────────────────────────────────

/**
 * Suggested plant count for a drift of `plant` over a traced `area` polygon, at
 * landscaped spacing (spec §Spacing & quantity math):
 *
 *   per-plant footprint = π · (width/2 + 1 ft clearance)²
 *   count = drift area ÷ footprint, rounded to the nearest **odd** number.
 *
 * Odd counts read as intentional drifts ("a triangle of 3, not 1 of 20" —
 * planting-design-heuristics). Always ≥ 1 for a real polygon. Falls back to a
 * 2-ft assumed width when the plant carries no size data (plan for a small
 * perennial rather than crash).
 */
export function suggestDriftCount(plant: SelectorPlant, area: Point[]): number {
  const areaFt2 = polygonArea(area)
  if (areaFt2 <= 0) return 0
  const footprint = driftFootprintFt2(plant)
  if (footprint <= 0) return 1
  return nearestOdd(areaFt2 / footprint)
}

/**
 * Landscaped per-plant footprint for a specific plant: circle at
 * (max width / 2 + 1 ft clearance). Uses the plant's own mature width when
 * known (plan for the mature plant, not the pot — vault/concepts/plant-spacing),
 * a 2-ft assumed width otherwise.
 */
export function driftFootprintFt2(plant: SelectorPlant): number {
  const widthFt = plant.width_ft_range?.max ?? 2
  const radius = widthFt / 2 + LANDSCAPED_CLEARANCE_FT
  return Math.PI * radius * radius
}

/** Round to the nearest odd integer ≥ 1. 3.2 → 3, 4 → 5 (ties round up). */
export function nearestOdd(value: number): number {
  if (value <= 1) return 1
  const rounded = Math.round(value)
  if (rounded % 2 === 1) return rounded
  // Even — nudge to the nearer odd; on an exact .5 tie Math.round already went
  // up, so we only reach here for a genuine even. Pick the odd nearer to value.
  return value >= rounded ? rounded + 1 : rounded - 1
}

/** The odd-count stepper options the drift UI offers (spec: 3/5/7/9). */
export const DRIFT_STEPS = [3, 5, 7, 9] as const

// ── matrixFill spacing ────────────────────────────────────────────────────────

/** Default matrix spacing (spec: 15" centers, editable 12–18"). */
export const DEFAULT_MATRIX_SPACING_IN = 15
/** The editable spacing band (spec: 12–18" centers). */
export const MIN_MATRIX_SPACING_IN = 12
export const MAX_MATRIX_SPACING_IN = 18

/** Matrix grid cell area for a given on-center spacing: (spacing in feet)². */
export function matrixCellFt2ForSpacing(spacingIn: number): number {
  // Clamp out-of-range spacings to the sensible 12–18" band so a stray 0 (or a
  // huge value) never yields an absurd density.
  const clampedIn = Math.min(
    MAX_MATRIX_SPACING_IN,
    Math.max(MIN_MATRIX_SPACING_IN, spacingIn || MIN_MATRIX_SPACING_IN),
  )
  const spacingFt = clampedIn / 12
  return spacingFt * spacingFt
}

// ── Placement quantities ──────────────────────────────────────────────────────

/** Per-species count from a single placement. */
export interface SpeciesCount {
  plantSlug: string
  count: number
}

/**
 * placementQuantity — total plant count for one placement.
 *
 *   individual → 1
 *   drift      → the traced/adjusted count
 *   matrixFill → total grid cells over the covered area (Σ of the per-species
 *                counts). `sectionAreaFt2` is the covered area: we assume the
 *                fill covers the whole active section (spec: "assigned to the
 *                whole active section region by default"), minus nothing fancy.
 *                Callers wanting a partial fill pass the sub-area they intend.
 *
 * Documented assumptions:
 *   - matrixFill coveredArea = the section area passed in (no path/obstruction
 *     subtraction in v1 — kept simple and honestly rough, like the estimate).
 *   - grid count = coveredArea ÷ cell(spacing); shares split it and each species
 *     rounds independently, so the species counts can sum to ±1 of the grid
 *     count. That's within the "rough feel, not a shopping list" tolerance.
 */
export function placementQuantity(placement: Placement, sectionAreaFt2: number): number {
  const counts = placementSpeciesCounts(placement, sectionAreaFt2)
  return counts.reduce((sum, c) => sum + c.count, 0)
}

/**
 * Per-species counts for one placement. Individual/drift resolve to a single
 * species; matrixFill splits the grid count across its mix by `sharePct`.
 */
export function placementSpeciesCounts(
  placement: Placement,
  sectionAreaFt2: number,
): SpeciesCount[] {
  switch (placement.kind) {
    case 'individual':
      return [{ plantSlug: placement.plantSlug, count: 1 }]
    case 'drift':
      return [{ plantSlug: placement.plantSlug, count: Math.max(0, Math.round(placement.count)) }]
    case 'matrixFill': {
      const covered = Math.max(0, sectionAreaFt2)
      const cell = matrixCellFt2ForSpacing(placement.spacingIn)
      const grid = cell > 0 ? covered / cell : 0
      const total = normalizeShares(placement.mix)
      return placement.mix.map((m) => ({
        plantSlug: m.plantSlug,
        count: Math.round(grid * (safeShare(m.sharePct) / total)),
      }))
    }
  }
}

// ── Per-section rollups ───────────────────────────────────────────────────────

export interface SectionLayerCounts {
  sectionId: string
  /** Total plant count for the section across all its placements. */
  total: number
  /** Count by the four planting layers. */
  byLayer: Record<LayerRole, number>
  /** Per-species totals within the section (slug → count). */
  bySpecies: Record<string, number>
}

/** An empty per-layer record — the zero for a section with no placements. */
export function emptyLayerCounts(): Record<LayerRole, number> {
  return { structural: 0, seasonal: 0, groundcover: 0, filler: 0 }
}

/**
 * sectionQuantities — per-section, per-layer counts + species totals across a
 * plan's placements. The placement-based refinement of the area-based estimate.
 *
 * `corpus` is accepted for symmetry with the rest of the palette API (and so a
 * caller can key species names off it) but isn't needed for the counts
 * themselves — quantities derive from the placement geometry + section area.
 *
 * @param sections   the plan's sections (for area lookup by id)
 * @param placements the plan's placements
 * @param corpus     the plant corpus (unused for the math; reserved for callers)
 */
export function sectionQuantities(
  sections: Section[],
  placements: Placement[],
  corpus?: SelectorPlant[],
): Record<string, SectionLayerCounts> {
  const areaBySection = new Map<string, number>()
  for (const s of sections) areaBySection.set(s.id, polygonArea(s.polygon))

  const out: Record<string, SectionLayerCounts> = {}
  for (const s of sections) {
    out[s.id] = {
      sectionId: s.id,
      total: 0,
      byLayer: emptyLayerCounts(),
      bySpecies: {},
    }
  }

  for (const placement of placements) {
    const bucket = out[placement.sectionId]
    if (!bucket) continue // orphaned placement (section deleted) — skip quietly
    const area = areaBySection.get(placement.sectionId) ?? 0
    const speciesCounts = placementSpeciesCounts(placement, area)
    const placementTotal = speciesCounts.reduce((sum, c) => sum + c.count, 0)

    bucket.total += placementTotal
    bucket.byLayer[placement.layerRole] += placementTotal
    for (const c of speciesCounts) {
      bucket.bySpecies[c.plantSlug] = (bucket.bySpecies[c.plantSlug] ?? 0) + c.count
    }
  }

  return out
}

// ── Layer shares vs. the target silhouette ────────────────────────────────────

/**
 * The four-layer target silhouette (spec / vault/concepts/planting-layers):
 * structural 10–15% / seasonal 25–40% / groundcover ~50% / filler 5–10% of
 * total plant quantity. Stored as [min, max] bands per role for the meter's
 * under/over hints.
 */
export const LAYER_TARGET_BANDS: Record<LayerRole, { min: number; max: number }> = {
  structural: { min: 0.1, max: 0.15 },
  seasonal: { min: 0.25, max: 0.4 },
  groundcover: { min: 0.45, max: 0.55 }, // "~50%"
  filler: { min: 0.05, max: 0.1 },
}

export type LayerVerdict = 'thin' | 'ok' | 'heavy'

export interface LayerShare {
  role: LayerRole
  count: number
  /** Share of the section's total quantity, 0–1. */
  share: number
  /** Where the share sits vs. the target band. */
  verdict: LayerVerdict
}

/**
 * layerShares — share of the total quantity per layer, judged against the
 * target silhouette. A section with no plants yet returns all-zero shares with a
 * 'thin' verdict for the ground plane (bare soil re-invites weeds — the meter's
 * whole reason to exist). Order matches the visual stacking: structural →
 * seasonal → groundcover → filler.
 */
export function layerShares(byLayer: Record<LayerRole, number>): LayerShare[] {
  const roles: LayerRole[] = ['structural', 'seasonal', 'groundcover', 'filler']
  const total = roles.reduce((sum, r) => sum + byLayer[r], 0)

  return roles.map((role) => {
    const count = byLayer[role]
    const share = total > 0 ? count / total : 0
    const band = LAYER_TARGET_BANDS[role]
    let verdict: LayerVerdict = 'ok'
    if (share < band.min) verdict = 'thin'
    else if (share > band.max) verdict = 'heavy'
    return { role, count, share, verdict }
  })
}

// ── Internals ─────────────────────────────────────────────────────────────────

function safeShare(pct: number): number {
  return Number.isFinite(pct) && pct > 0 ? pct : 0
}

/** Sum of a mix's shares, guarded against an all-zero mix (→ 1, avoids /0). */
function normalizeShares(mix: { sharePct: number }[]): number {
  const sum = mix.reduce((s, m) => s + safeShare(m.sharePct), 0)
  return sum > 0 ? sum : 1
}
