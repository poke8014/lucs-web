// Per-section plant-count / effort / cost estimate — the manageability payoff
// (spec §Spacing & quantity math, at the *section* level). Pure and unit-tested;
// placements come later (unit E), so this is the area-based *live* estimate the
// section panel shows the moment a polygon and a density style land.
//
// Two density styles, two spacing models (vault/concepts/plant-spacing):
//   landscaped   — "give every plant breathing room": mature footprint circle
//                  (radius + 1 ft clearance so foliage doesn't touch). Count =
//                  area ÷ per-plant footprint area. Sparser, more legible.
//   naturalistic — designed plant community: a ground-cover matrix at 15" default
//                  centers carries the density, with the design layers stacked
//                  over it. Count = matrix grid count, and the four layer shares
//                  (types.ts LayerRole comment) split that total by role.
//
// Everything here is deliberately rough and clearly labeled as such in the UI —
// the estimate is a feel for "is this a section I can do in a weekend?", never a
// shopping list. Unit price is editable state the caller passes in.

import type { LayerRole } from './types'

// ── Documented defaults (all overridable / passed in) ────────────────────────

/**
 * Landscaped footprint: an "average mature" plant read as a 3-ft-wide circle
 * (1.5 ft radius) plus 1 ft of clearance so foliage doesn't touch its neighbor
 * (vault/concepts/plant-spacing — "≥ 1 ft open space" / foliage-just-touches).
 * Effective radius 2.5 ft → footprint area π·2.5² ≈ 19.6 sq ft. A blunt average
 * across the palette; a section full of small perennials packs tighter, a
 * section of big shrubs looser, and the per-plant placement in unit E refines it.
 */
export const LANDSCAPED_AVG_WIDTH_FT = 3
export const LANDSCAPED_CLEARANCE_FT = 1

/**
 * Naturalistic matrix spacing: 15" on-center default (the middle of the spec's
 * 12–18" band). The matrix grid area per plant is spacing² → (1.25 ft)² ≈ 1.56
 * sq ft. Tight, overlapping, weed-suppressing ground-cover density by design.
 */
export const NATURALISTIC_MATRIX_SPACING_IN = 15

/**
 * Layer-share targets (vault/concepts/planting-layers, echoed in types.ts):
 * structural 10–15% / seasonal 25–40% / groundcover ~50% / filler 5–10% of
 * total quantity. Each value sits inside its band and the four sum to exactly 1
 * (groundcover pinned at ~50%, structural/filler at their midpoints, seasonal
 * taking the remainder — still comfortably inside 25–40%). These drive the
 * naturalistic per-layer breakdown.
 */
export const LAYER_SHARE_TARGETS: Record<LayerRole, number> = {
  structural: 0.125, // 10–15% → 12.5%
  seasonal: 0.3, // 25–40% → 30% (the remainder that closes to 1)
  groundcover: 0.5, // ~50%
  filler: 0.075, // 5–10% → 7.5%
}

/** Default "rough" unit price per plant, per container class. Clearly rough. */
export const DEFAULT_UNIT_PRICE_USD = 12 // a 1-gal native, ballpark

// Effort bands: total plant count → a friendly time feel. Deliberately coarse —
// planting is the fun part, and small sections keep momentum (phased-planting).
const EFFORT_BANDS: { max: number; label: string }[] = [
  { max: 15, label: 'roughly an afternoon' },
  { max: 45, label: 'roughly a weekend' },
  { max: Infinity, label: 'a few weekends' },
]

/**
 * The plain time-feel for a plant count ("roughly a weekend"), without the
 * count prefix. Exported so the placement-based quantities panel (unit E) reads
 * off the same bands the area-based estimate uses — one effort vocabulary.
 */
export function effortBandFor(count: number): string {
  const band = EFFORT_BANDS.find((b) => count <= b.max) ?? EFFORT_BANDS[EFFORT_BANDS.length - 1]
  return band.label
}

/**
 * A soft ± cost band around count × unit price, in whole dollars. Shared by the
 * area-based estimate and the placement-based quantities panel so both round the
 * same way. `costSpread` defaults to ±20% — rough-estimate honesty.
 */
export function costBand(
  count: number,
  unitPrice: number,
  costSpread = 0.2,
): { low: number; high: number } {
  const nominal = count * unitPrice
  return {
    low: Math.round(nominal * (1 - costSpread)),
    high: Math.round(nominal * (1 + costSpread)),
  }
}

// ── Public types ──────────────────────────────────────────────────────────────

export type DensityStyle = 'landscaped' | 'naturalistic'

export interface SectionEstimate {
  /** Total approximate plant count across all layers. */
  totalCount: number
  /** Per-layer counts (naturalistic only splits by role; landscaped is a lump). */
  byLayer: Record<LayerRole, number>
  /** A friendly effort feel: "~34 plants — roughly a weekend". */
  effortLabel: string
  /** Cost range in whole dollars — a soft ± band around count × unit price. */
  costLow: number
  costHigh: number
  /** The unit price used, echoed back so the panel can label the math. */
  unitPrice: number
}

export interface EstimateOptions {
  /** Editable "rough" per-plant price; defaults to a 1-gal native ballpark. */
  unitPrice?: number
  /** ± fraction for the cost band (0.2 = ±20%). Rough estimate honesty. */
  costSpread?: number
}

// ── The estimate ──────────────────────────────────────────────────────────────

/**
 * estimateSection — area-based live estimate for one section.
 *
 * @param densityStyle  which spacing model to use (per section, Luc 2026-07-03)
 * @param areaFt2       the section polygon's area in square feet (from
 *                      geometry.polygonArea — the caller computes it)
 * @returns count + per-layer split + effort band + cost range.
 *
 * A zero/negative area yields an all-zero estimate (a section with no polygon
 * yet). Counts are whole plants, rounded to the nearest.
 */
export function estimateSection(
  densityStyle: DensityStyle,
  areaFt2: number,
  options: EstimateOptions = {},
): SectionEstimate {
  const unitPrice = options.unitPrice ?? DEFAULT_UNIT_PRICE_USD
  const costSpread = options.costSpread ?? 0.2
  const area = Math.max(0, areaFt2)

  const byLayer =
    densityStyle === 'landscaped'
      ? landscapedByLayer(area)
      : naturalisticByLayer(area)

  const totalCount = layerSum(byLayer)
  const { low, high } = costBand(totalCount, unitPrice, costSpread)

  return {
    totalCount,
    byLayer,
    effortLabel: effortLabelFor(totalCount),
    costLow: low,
    costHigh: high,
    unitPrice,
  }
}

/**
 * Landscaped: one lump of individually-spaced plants at the average footprint.
 * The whole count reads as "structural" for the byLayer record only so the shape
 * is uniform — landscaped sections don't split by the four-layer model (that's
 * the naturalistic community idea). The panel shows the lump, not the split.
 */
function landscapedByLayer(areaFt2: number): Record<LayerRole, number> {
  const footprint = landscapedFootprintFt2()
  const count = footprint > 0 ? Math.round(areaFt2 / footprint) : 0
  return { structural: count, seasonal: 0, groundcover: 0, filler: 0 }
}

/**
 * Naturalistic: the matrix grid sets the total, then the four layer shares split
 * it. Structural/seasonal are the sparser design layers *over* the matrix, so we
 * model total density as the matrix count and apportion by share — the layers
 * co-occupy the ground plane (that's the whole point of stacking), so their
 * counts sum to the matrix total rather than adding on top of it.
 */
function naturalisticByLayer(areaFt2: number): Record<LayerRole, number> {
  const cell = matrixCellFt2()
  const total = cell > 0 ? areaFt2 / cell : 0
  return {
    structural: Math.round(total * LAYER_SHARE_TARGETS.structural),
    seasonal: Math.round(total * LAYER_SHARE_TARGETS.seasonal),
    groundcover: Math.round(total * LAYER_SHARE_TARGETS.groundcover),
    filler: Math.round(total * LAYER_SHARE_TARGETS.filler),
  }
}

// ── Footprint / cell geometry ─────────────────────────────────────────────────

/** Landscaped per-plant footprint area: circle at (width/2 + clearance). */
export function landscapedFootprintFt2(): number {
  const radius = LANDSCAPED_AVG_WIDTH_FT / 2 + LANDSCAPED_CLEARANCE_FT
  return Math.PI * radius * radius
}

/** Naturalistic matrix cell area: (spacing in feet)². */
export function matrixCellFt2(): number {
  const spacingFt = NATURALISTIC_MATRIX_SPACING_IN / 12
  return spacingFt * spacingFt
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function layerSum(byLayer: Record<LayerRole, number>): number {
  return (
    byLayer.structural + byLayer.seasonal + byLayer.groundcover + byLayer.filler
  )
}

function effortLabelFor(count: number): string {
  return `~${count} plant${count === 1 ? '' : 's'} — ${effortBandFor(count)}`
}
