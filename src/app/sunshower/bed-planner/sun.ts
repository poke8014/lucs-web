// Sun/shade timelapse — unit H, module 1: solar position + season/time sampling.
//
// Hand-rolled solar geometry (NOAA-style low-precision approximation), NO npm
// dependency — the spec bans adding suncalc. Accuracy is bounded and documented
// below; the timelapse is a "model, not truth" advisory overlay (spec §The
// sun/shade timelapse), so a degree or two of error is well within tolerance.
//
// PRIVACY CONTRACT (spec §Base map privacy; HANDOFF invariant 8: v1 is South
// Bay-scoped): the sun engine runs on a FIXED regional latitude constant, never
// an address-derived coordinate. `latLng` is deliberately kept off the saved
// GardenPlan; nothing here reads user location.

/**
 * Fixed South Bay latitude for the v1 sun model. San Jose sits at ~37.3°N.
 * This is a regional constant on purpose — see the privacy contract above; the
 * timelapse must never key off an address-derived lat/lng.
 */
export const SOUTH_BAY_LATITUDE_DEG = 37.3

export type Season = 'winter' | 'spring' | 'summer' | 'fall'
export type TimeOfDay = 'morning' | 'midday' | 'afternoon'

export const SEASONS: Season[] = ['winter', 'spring', 'summer', 'fall']
export const TIMES_OF_DAY: TimeOfDay[] = ['morning', 'midday', 'afternoon']

/**
 * Representative day-of-year per season, sampled at the solstices/equinoxes
 * (spec: "seasons sampled at solstices/equinoxes"). Non-leap-year day numbers:
 * spring equinox ≈ Mar 20 (79), summer solstice ≈ Jun 21 (172), fall equinox ≈
 * Sep 22 (265), winter solstice ≈ Dec 21 (355).
 */
export const SEASON_DAY_OF_YEAR: Record<Season, number> = {
  spring: 79,
  summer: 172,
  fall: 265,
  winter: 355,
}

/**
 * Local solar hour per time-of-day bucket (spec: morning 9am / midday 12pm /
 * afternoon 3pm local solar time). "Solar" time, not clock time — we don't model
 * the equation of time or a longitude/timezone offset, which is fine at this
 * fidelity (the shadow model's dominant error is traced obstruction heights, not
 * a few minutes of clock skew).
 */
export const TIME_OF_DAY_HOUR: Record<TimeOfDay, number> = {
  morning: 9,
  midday: 12,
  afternoon: 15,
}

export interface SunPosition {
  /** Degrees above the horizon. Negative ⇒ the sun is down (no direct light). */
  altitudeDeg: number
  /** Compass azimuth, degrees clockwise from true north (0 = N, 90 = E, 180 = S, 270 = W). */
  azimuthDeg: number
}

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

/**
 * Solar position for a given day-of-year, local solar hour, and latitude.
 *
 * Method (standard low-precision solar-geometry chain):
 *   1. Solar declination δ from a cosine approximation of the Earth's tilt,
 *      peaking at +23.44° at the summer solstice (day 172) and −23.44° at the
 *      winter solstice. δ ≈ −23.44° · cos(360° · (dayOfYear + 10) / 365).
 *   2. Hour angle H = 15° · (hourLocal − 12) — the sun moves 15°/hour, zero at
 *      solar noon, negative in the morning (east), positive in the afternoon.
 *   3. Altitude: sin(alt) = sin(φ)·sin(δ) + cos(φ)·cos(δ)·cos(H).
 *   4. Azimuth from the standard formula, resolved to a full 0–360° compass
 *      bearing clockwise from north.
 *
 * Accuracy: this ignores the equation of time, atmospheric refraction, and
 * nutation. Against a full ephemeris it lands within ~1–2° of altitude/azimuth
 * for mid-latitudes — validated in sun.test.ts against known San Jose values
 * (summer-noon alt ≈ 76°, winter ≈ 29°, equinox ≈ 53°; summer sunrise NE,
 * winter sunrise SE). Ample for an advisory shadow overlay.
 *
 * @param dayOfYear 1–365 (leap day not modeled; negligible at this fidelity)
 * @param hourLocal 0–24, local solar time (noon = sun near due south here)
 * @param latitudeDeg defaults to the fixed South Bay latitude (privacy contract)
 */
export function sunPosition(
  dayOfYear: number,
  hourLocal: number,
  latitudeDeg: number = SOUTH_BAY_LATITUDE_DEG,
): SunPosition {
  const declDeg = -23.44 * Math.cos(DEG * ((360 / 365) * (dayOfYear + 10)))
  const decl = declDeg * DEG
  const lat = latitudeDeg * DEG
  const hourAngle = 15 * (hourLocal - 12) * DEG

  const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle)
  const altitude = Math.asin(clamp(sinAlt, -1, 1))

  // Azimuth measured clockwise from north. Derive from the sun's horizontal
  // components: north-ward and east-ward projections of the sun vector.
  const cosAlt = Math.cos(altitude)
  let azimuthDeg: number
  if (cosAlt < 1e-6) {
    // Sun at the zenith (never happens at 37°N, but keep it defined).
    azimuthDeg = 180
  } else {
    // sinAz / cosAz give east / north components (standard NOAA decomposition).
    const sinAz = -Math.sin(hourAngle) * Math.cos(decl)
    const cosAz = (Math.sin(decl) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * cosAlt)
    azimuthDeg = Math.atan2(sinAz, clamp(cosAz, -1, 1)) * RAD
    azimuthDeg = ((azimuthDeg % 360) + 360) % 360
  }

  return { altitudeDeg: altitude * RAD, azimuthDeg }
}

/** Convenience: solar position at a season's representative day + time bucket. */
export function sunPositionAt(
  season: Season,
  timeOfDay: TimeOfDay,
  latitudeDeg: number = SOUTH_BAY_LATITUDE_DEG,
): SunPosition {
  return sunPosition(SEASON_DAY_OF_YEAR[season], TIME_OF_DAY_HOUR[timeOfDay], latitudeDeg)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}
