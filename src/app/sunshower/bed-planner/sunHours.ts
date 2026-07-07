// Sun/shade timelapse — unit H, module 3: per-section computed sun → SunTier.
//
// The payoff of the timelapse (spec §The sun/shade timelapse): aggregate
// computed direct-sun hours per section per season into a suggested SunTier the
// user can accept (sets labels.sunSource = 'simulated') or ignore. Advisory —
// stated labels are never silently overwritten (that wiring is unit I's).
//
// Pure + unit-tested (sun-hours.test.ts). Runs on the fixed South Bay latitude
// via sun.ts — no address-derived coordinate (privacy contract).

import type { Obstruction, Section } from './types'
import type { SunTier } from '../site-inventory/types'
import { pointInPolygon, polygonBounds } from './geometry'
import { sunPosition, SEASON_DAY_OF_YEAR, SEASONS, type Season } from './sun'
import { azimuthToFeetDir, extrudeFootprint, shadowLengthFt } from './shadows'

// Sampling knobs. The grid resolves the section's interior; the hourly sweep
// (8am–4pm) is finer than the 3 display buckets so the sun-hours estimate is
// accurate, per spec ("sample hourly 8am–4pm for accuracy here").
const GRID_STEP_FT = 3
const SUN_START_HOUR = 8
const SUN_END_HOUR = 16 // inclusive-ish sweep 8,9,…,16 → the 8am–4pm daylight band
const MIN_SUN_ALTITUDE_DEG = 3 // below this the sun is grazing/effectively down

export interface SunSuggestion {
  tier: SunTier
  /** Estimated direct-sun hours in each season's representative day. */
  sunHoursBySeason: Record<Season, number>
  /** Always 'low' — traced heights + regional latitude bound the fidelity. */
  confidence: 'low'
}

/**
 * Suggest a SunTier for a section from computed direct-sun hours. Samples a grid
 * of interior points, sweeps each daylight hour, and counts the fraction of the
 * section in direct sun (mean over the grid) → hours. The growing season
 * (spring + summer) drives the tier; the morning/afternoon split disambiguates
 * the two partial-shade tiers.
 *
 * Returns `undefined` for a section with no usable polygon — nothing to suggest.
 */
export function suggestSunTier(
  section: Section,
  obstructions: Obstruction[],
  northBearingDeg = 0,
): SunSuggestion | undefined {
  if (section.polygon.length < 3) return undefined

  const grid = sampleGrid(section)
  if (grid.length === 0) return undefined

  const sunHoursBySeason = {} as Record<Season, number>
  // Track growing-season AM vs PM sun to split the two partial-shade tiers.
  let growingAmSun = 0
  let growingPmSun = 0
  let growingHoursSampled = 0

  for (const season of SEASONS) {
    let seasonSunPointHours = 0
    const growing = season === 'spring' || season === 'summer'
    for (let hour = SUN_START_HOUR; hour <= SUN_END_HOUR; hour++) {
      const litFraction = directSunFraction(grid, season, hour, obstructions, northBearingDeg)
      seasonSunPointHours += litFraction
      if (growing) {
        if (hour < 12) growingAmSun += litFraction
        else if (hour > 12) growingPmSun += litFraction
        growingHoursSampled += 1
      }
    }
    // Mean lit fraction across the grid, summed over hours = section sun-hours.
    sunHoursBySeason[season] = round1(seasonSunPointHours)
  }

  const growingSunHours = (sunHoursBySeason.spring + sunHoursBySeason.summer) / 2
  const amBias = growingHoursSampled > 0 ? growingAmSun - growingPmSun : 0
  const tier = tierFromHours(growingSunHours, amBias)

  return { tier, sunHoursBySeason, confidence: 'low' }
}

/**
 * Fraction (0–1) of the sampled grid in direct sun at one (season, hour). A
 * point is lit when the sun is up and no obstruction shadow covers it.
 */
function directSunFraction(
  grid: { x: number; y: number }[],
  season: Season,
  hour: number,
  obstructions: Obstruction[],
  northBearingDeg: number,
): number {
  const sun = sunPosition(SEASON_DAY_OF_YEAR[season], hour)
  if (sun.altitudeDeg < MIN_SUN_ALTITUDE_DEG) return 0 // sun down/grazing → all shade

  // Build each obstruction's swept shadow region once, then test every point
  // against them. Shadow points away from the sun (azimuth + 180°).
  const shadowDir = azimuthToFeetDir(sun.azimuthDeg + 180, northBearingDeg)
  const perFoot = shadowLengthFt(sun.altitudeDeg)
  const regions: { x: number; y: number }[][][] = []
  for (const ob of obstructions) {
    const h = ob.heightFt ?? 0
    if (h <= 0 || ob.footprint.length < 3) continue
    if (isDeciduousBare(ob, season)) continue // deciduous tree in winter: no shade
    const offset = { x: shadowDir.x * perFoot * h, y: shadowDir.y * perFoot * h }
    regions.push(extrudeFootprint(ob.footprint, offset))
  }

  let lit = 0
  for (const p of grid) {
    if (!isShaded(p, regions)) lit++
  }
  return lit / grid.length
}

/** A point is shaded if it lands inside any obstruction's swept shadow region. */
function isShaded(p: { x: number; y: number }, regions: { x: number; y: number }[][][]): boolean {
  for (const rings of regions) {
    // The swept region = footprint ∪ edge quads; membership is the OR of the
    // rings (a nonzero-fill union), so a hit in any ring means shaded.
    for (const ring of rings) {
      if (pointInPolygon(p, ring)) return true
    }
  }
  return false
}

/** Deciduous trees are bare in winter → cast no shade (matches shadows.ts). */
function isDeciduousBare(ob: Obstruction, season: Season): boolean {
  return ob.kind === 'tree' && ob.deciduous === true && season === 'winter'
}

/** Grid of interior sample points, clamped to at least the polygon centroid. */
function sampleGrid(section: Section): { x: number; y: number }[] {
  const b = polygonBounds(section.polygon)
  const points: { x: number; y: number }[] = []
  for (let y = b.minY + GRID_STEP_FT / 2; y < b.maxY; y += GRID_STEP_FT) {
    for (let x = b.minX + GRID_STEP_FT / 2; x < b.maxX; x += GRID_STEP_FT) {
      const p = { x, y }
      if (pointInPolygon(p, section.polygon)) points.push(p)
    }
  }
  // Small sections can miss every grid node; fall back to a single center sample
  // so a tiny bed still gets a suggestion.
  if (points.length === 0) {
    const c = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
    if (pointInPolygon(c, section.polygon)) points.push(c)
  }
  return points
}

/**
 * Map growing-season direct-sun hours → the 5-tier SunTier vocabulary. The
 * industry rule of thumb (vault/concepts/sun-requirements): full sun ≥ 6 h,
 * part sun/part shade ~3–6 h, full/deep shade < 3 h. The two partial tiers are
 * split by whether the section gets its sun in the morning or afternoon.
 *
 *   ≥ 6 h  → full_sun
 *   3–6 h  → morning_sun_afternoon_shade | morning_shade_afternoon_sun (by bias)
 *   1.5–3 h→ dappled_shade
 *   < 1.5 h→ full_shade
 *
 * @param amBias growing-season (AM lit-hours − PM lit-hours); >0 ⇒ morning sun.
 */
export function tierFromHours(hours: number, amBias: number): SunTier {
  if (hours >= 6) return 'full_sun'
  if (hours >= 3) {
    return amBias >= 0 ? 'morning_sun_afternoon_shade' : 'morning_shade_afternoon_sun'
  }
  if (hours >= 1.5) return 'dappled_shade'
  return 'full_shade'
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
