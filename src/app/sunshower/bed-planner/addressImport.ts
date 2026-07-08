// Address on-ramp: geocode → building footprints → feet-space geometry.
//
// PRIVACY CONTRACT (spec §Scope decisions, hard requirement): the address and
// any lat/lng are used **once, in-session, here**, and never returned to the
// caller or persisted. This module's public result is de-identified feet-space
// geometry only — no address, no coordinates. The lat/lng lives in local
// variables inside `importAddress` and is discarded when it returns.
//
// SPIKE VERDICT (2026-07-06, unit B): Nominatim geocoding is reliable; the
// Overpass building-footprint fetch is *intermittent* (busy/timeout, no
// dependable free mirror). So this is best-effort: on any failure — geocode
// miss, Overpass error, empty result — it reports a friendly reason and the UI
// degrades to instructions + hand-trace. Nothing is ever fetched that the user
// didn't explicitly initiate, and no key/env var is required.

import type { Obstruction, Polygon } from './types'
import { boundingBox, defaultObstructionHeightFt, latLngRingToFeet, type LatLng } from './baseMapMath'
import { newId } from './plan'

export interface AddressImportSuccess {
  ok: true
  /** Yard boundary starting point (bbox of the primary building, padded). */
  boundary: Polygon
  widthFt: number
  heightFt: number
  /** The building footprint(s), as `building` obstructions in feet-space. */
  obstructions: Obstruction[]
}

export interface AddressImportFailure {
  ok: false
  /** Friendly, user-facing reason — routes them to the other two on-ramps. */
  reason: string
}

export type AddressImportResult = AddressImportSuccess | AddressImportFailure

// Nominatim asks for a descriptive User-Agent / Referer; browsers set Referer
// automatically. Fetches are read-only GETs against public, keyless endpoints.
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OVERPASS = 'https://overpass-api.de/api/interpreter'
const SEARCH_RADIUS_M = 45 // buildings within ~45 m of the geocoded point
const PAD_FT = 15 // pad the boundary out from the building so there's yard

/**
 * Run the full address → geometry pipeline. `signal` lets the UI cancel.
 * Resolves (never rejects) with a tagged result so the caller has one path.
 */
export async function importAddress(
  address: string,
  signal?: AbortSignal,
): Promise<AddressImportResult> {
  const query = address.trim()
  if (!query) return { ok: false, reason: 'Type an address to trace from.' }

  // ── Step 1: geocode (reliable) ────────────────────────────────────────────
  let origin: LatLng
  try {
    const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1`
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`geocode ${res.status}`)
    const hits: unknown = await res.json()
    if (!Array.isArray(hits) || hits.length === 0) {
      return {
        ok: false,
        reason: "Couldn't find that address. Try adding city + state, or trace it by hand below.",
      }
    }
    const top = hits[0] as { lat?: string; lon?: string }
    const lat = Number(top.lat)
    const lng = Number(top.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, reason: 'That address came back without a location. Try the hand-trace path.' }
    }
    origin = { lat, lng } // ← the only place coordinates live; never returned
  } catch (e) {
    if (isAbort(e)) return { ok: false, reason: 'Import cancelled.' }
    return { ok: false, reason: "Couldn't reach the address lookup. Try again, or trace it by hand." }
  }

  // ── Step 2: building footprints (intermittent — degrade on any failure) ────
  let rings: LatLng[][]
  try {
    rings = await fetchBuildingRings(origin, signal)
  } catch (e) {
    if (isAbort(e)) return { ok: false, reason: 'Import cancelled.' }
    return {
      ok: false,
      reason:
        "The building-outline service is busy right now — it's free and a bit flaky. Try again in a moment, or upload a screenshot / trace by hand below.",
    }
  }
  if (rings.length === 0) {
    return {
      ok: false,
      reason:
        "No building outline found near that address in OpenStreetMap. Upload a screenshot or draw the yard by hand — the result's the same either way.",
    }
  }

  // ── Step 3: project to feet-space, drop the coordinates ───────────────────
  // Convert every ring against the shared origin so buildings keep their
  // relative positions, then pad a boundary around the largest footprint.
  const feetRings = rings.map((r) => latLngRingToFeet(r, origin))
  const primary = feetRings.reduce((a, b) => (ringArea(b) > ringArea(a) ? b : a))
  const bbox = boundingBox(primary)
  const boundary: Polygon = [
    { x: -PAD_FT, y: -PAD_FT },
    { x: bbox.widthFt + PAD_FT, y: -PAD_FT },
    { x: bbox.widthFt + PAD_FT, y: bbox.heightFt + PAD_FT },
    { x: -PAD_FT, y: bbox.heightFt + PAD_FT },
  ]
  // Same one-story starting height as a hand-traced building — without it the
  // shade timelapse would skip these (it extrudes heightFt and drops <= 0).
  const obstructions: Obstruction[] = feetRings.map((footprint) => ({
    id: newId(),
    kind: 'building',
    footprint,
    heightFt: defaultObstructionHeightFt('building'),
  }))

  return {
    ok: true,
    boundary,
    widthFt: bbox.widthFt + PAD_FT * 2,
    heightFt: bbox.heightFt + PAD_FT * 2,
    obstructions,
  }
  // `origin` (lat/lng) goes out of scope here — nothing above it is persisted.
}

/**
 * Overpass query for building ways near the point, returning their geometry as
 * rings of {lat, lng}. `out geom;` inlines node coordinates on each way.
 */
async function fetchBuildingRings(origin: LatLng, signal?: AbortSignal): Promise<LatLng[][]> {
  const q =
    `[out:json][timeout:20];` +
    `(way["building"](around:${SEARCH_RADIUS_M},${origin.lat},${origin.lng}););` +
    `out geom;`
  const res = await fetch(OVERPASS, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(q),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
  })
  if (!res.ok) throw new Error(`overpass ${res.status}`)
  const data: unknown = await res.json()
  const elements = (data as { elements?: unknown }).elements
  if (!Array.isArray(elements)) return []
  const rings: LatLng[][] = []
  for (const el of elements) {
    const geom = (el as { geometry?: unknown }).geometry
    if (!Array.isArray(geom)) continue
    const ring: LatLng[] = []
    for (const node of geom) {
      const lat = (node as { lat?: number }).lat
      const lon = (node as { lon?: number }).lon // Overpass names it `lon`
      if (typeof lat === 'number' && typeof lon === 'number') ring.push({ lat, lng: lon })
    }
    if (ring.length >= 3) rings.push(ring)
  }
  return rings
}

/** Shoelace area (feet²) — used only to pick the largest footprint. */
function ringArea(ring: Polygon): number {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]
    const q = ring[(i + 1) % ring.length]
    a += p.x * q.y - q.x * p.y
  }
  return Math.abs(a) / 2
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}
