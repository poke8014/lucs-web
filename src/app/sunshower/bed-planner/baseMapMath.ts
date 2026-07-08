// Pure math for the three base-map on-ramps — no React, no DOM. Everything the
// canvas needs to turn an address, an image, or a typed rectangle into the
// feet-space geometry the GardenPlan contract expects.

import type { Cardinal } from '../site-inventory/types'
import type { Obstruction, Point, Polygon } from './types'

// ── Scale calibration (image on-ramp) ───────────────────────────────────────
// The user draws a line over a feature of known real length (a fence panel, a
// driveway width) and types the feet. px-length ÷ feet → px-per-foot, the
// factor that makes everything else on the traced image measure correctly.

/** Screen-pixel length of a two-point line. */
export function lineLengthPx(a: { sx: number; sy: number }, b: { sx: number; sy: number }): number {
  return Math.hypot(b.sx - a.sx, b.sy - a.sy)
}

/**
 * px-per-foot from a calibration line: its on-screen length in px and the real
 * length the user typed in feet. Returns null for a degenerate line or a
 * non-positive length (the UI keeps the field open instead of storing NaN).
 */
export function pxPerFtFromCalibration(linePx: number, knownFt: number): number | null {
  if (!Number.isFinite(linePx) || !Number.isFinite(knownFt)) return null
  if (linePx <= 0 || knownFt <= 0) return null
  return linePx / knownFt
}

// ── Obstruction story presets (building height) ─────────────────────────────
// The contract wants heightFt on buildings for the future shade timelapse.
// Most users know "one story / two story," not a foot count — so offer presets
// with a free override. Rough but honest: 1 story ≈ 12 ft, 2 ≈ 22 ft.

export type StoryPreset = 1 | 2

const STORY_HEIGHT_FT: Record<StoryPreset, number> = {
  1: 12,
  2: 22,
}

export function storyToHeightFt(story: StoryPreset): number {
  return STORY_HEIGHT_FT[story]
}

/** Reverse-map a free-entered height to the nearest story preset, for UI echo. */
export function heightFtToStory(heightFt: number | undefined): StoryPreset | null {
  if (heightFt === undefined || !Number.isFinite(heightFt)) return null
  if (heightFt === STORY_HEIGHT_FT[1]) return 1
  if (heightFt === STORY_HEIGHT_FT[2]) return 2
  return null
}

// ── Default obstruction heights (all kinds) ─────────────────────────────────
// The shade timelapse skips any obstruction with heightFt <= 0 — a heightless
// trace silently casts nothing, which reads as "the timelapse is broken." So
// every kind with a sensible typical height starts with one; the obstruction
// list offers the free override. Rough but honest, like the story presets:
// a yard tree canopy ≈ 20 ft, a standard privacy fence ≈ 6 ft. `other` has no
// honest guess (boulder? shed? play structure?) and starts unset.

const DEFAULT_HEIGHT_FT: Partial<Record<Obstruction['kind'], number>> = {
  building: STORY_HEIGHT_FT[1],
  tree: 20,
  fence: 6,
}

export function defaultObstructionHeightFt(kind: Obstruction['kind']): number | undefined {
  return DEFAULT_HEIGHT_FT[kind]
}

// ── North bearing seed (from SiteProfile.aspect) ────────────────────────────
// northBearingDeg is the compass bearing of "up" on the canvas — 0 = north is
// straight up. The walkthrough captured *aspect* (the way the back of the yard
// faces, looking out). If we draw the yard the natural way — standing at the
// back looking out, so "out" is down-screen — then north sits opposite the
// facing direction. Seed a sensible default; the user then nudges it.

const CARDINAL_BEARING: Record<Cardinal, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
}

/**
 * Seed northBearingDeg from the yard's facing cardinal. Facing S (looking out
 * to the south, so south is down-screen) puts north up → 0°. The bearing is the
 * facing direction rotated 180° so "up" reads as the compass direction of north
 * relative to the drawing. Advisory only — a starting point the user corrects.
 */
export function northBearingFromAspect(cardinal: Cardinal | undefined): number {
  if (!cardinal) return 0
  return (CARDINAL_BEARING[cardinal] + 180) % 360
}

// ── Rectangle on-ramp ────────────────────────────────────────────────────────

/** A width×height rectangle as a closed feet-space boundary (origin at 0,0). */
export function rectangleBoundary(widthFt: number, heightFt: number): Polygon {
  const w = Math.max(0, widthFt)
  const h = Math.max(0, heightFt)
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
}

// ── OSM / address on-ramp: lat/lng ring → feet-space polygon ─────────────────
// Overpass returns building footprints as rings of { lat, lon }. We convert to
// a local flat-earth feet plane centered on the geocoded point: an equirect-
// angular projection, accurate to well under a foot at yard scale. **The
// lat/lng never leaves this function** — only the returned feet-space polygon
// is kept, satisfying the privacy contract (no coordinates on the saved plan).

export interface LatLng {
  lat: number
  lng: number
}

const FT_PER_DEG_LAT = 364000 // ~ feet per degree of latitude (≈ 111,320 m)

/**
 * Project a ring of lat/lng onto a feet plane centered at `origin`, y-down to
 * match the contract. Longitude degrees shrink by cos(latitude). The output is
 * translated so its bounding-box top-left sits at (0,0) — a tidy starting
 * canvas the user then corrects.
 */
export function latLngRingToFeet(ring: LatLng[], origin: LatLng): Polygon {
  if (ring.length === 0) return []
  const ftPerDegLng = FT_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180)
  const raw: Point[] = ring.map((p) => ({
    x: (p.lng - origin.lng) * ftPerDegLng,
    // y-down: increasing latitude (north) is up-screen, so negate.
    y: -(p.lat - origin.lat) * FT_PER_DEG_LAT,
  }))
  return translateToOrigin(raw)
}

/** Shift a polygon so its bounding-box top-left corner sits at (0, 0). */
export function translateToOrigin(poly: Polygon): Polygon {
  if (poly.length === 0) return []
  let minX = Infinity
  let minY = Infinity
  for (const p of poly) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
  }
  return poly.map((p) => ({ x: p.x - minX, y: p.y - minY }))
}

/** Axis-aligned bounding box of a polygon in feet. */
export function boundingBox(poly: Polygon): { widthFt: number; heightFt: number } {
  if (poly.length === 0) return { widthFt: 0, heightFt: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of poly) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { widthFt: maxX - minX, heightFt: maxY - minY }
}
