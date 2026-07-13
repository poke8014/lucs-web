// Address on-ramp: geocode → one bird's-eye raster the user traces over.
//
// PRIVACY CONTRACT (spec §Privacy, hard requirement / HANDOFF invariant 9): the
// address and its lat/lng are used **once, in-session, here** — to geocode, then
// to build the imagery-provider URL — and are never returned to the caller or
// persisted. The lat/lng flows to `fetchSatelliteImage` within this same call
// chain and stays in local variables; it never reaches a return value. This
// module's public success result carries a raster key, feet extents, and an
// attribution string only — nothing machine-readable about location (no address,
// no coordinates, no tile coords, no provider URL).
//
// DESIGN (spec §Scope decision 1): the address path is fetch-and-trace by
// design — the old Overpass auto-trace was our guesswork; the imagery is the
// user's own eyes. After a successful geocode we fetch one satellite tile and
// hand the caller its key + true footprint; the user traces their own boundary
// and obstructions over it. No auto-boundary, no auto-obstructions, no key/env
// var required (the imagery ladder degrades to keyless NAIP; see satelliteFetch).

import { fetchSatelliteImage, type Framing } from './satelliteFetch'
import type { BlobStore } from './blobStore'

export interface AddressImportSuccess {
  ok: true
  /** Key from `blobStore.putImage` — persist this on the plan, not the URL. */
  imageKey: string
  /** True footprint of the fetched tile, in feet (auto-scale — scope decision 2). */
  widthFt: number
  heightFt: number
  /** Rendered whenever the underlay shows (unit S3 chip). */
  attribution: string
  provider: 'mapbox' | 'naip'
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

/**
 * Run the address → imagery pipeline: geocode the address, then fetch one
 * satellite raster centered on it. `signal` lets the UI cancel. Resolves (never
 * rejects) with a tagged result so the caller has one path.
 */
export async function importAddress(
  address: string,
  framing: Framing,
  blobStore: BlobStore,
  signal?: AbortSignal,
): Promise<AddressImportResult> {
  const query = address.trim()
  if (!query) return { ok: false, reason: 'Type an address to fetch a photo of.' }

  // ── Geocode (reliable) ────────────────────────────────────────────────────
  let origin: { lat: number; lng: number }
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

  // ── Fetch the imagery (in the same in-session call chain) ─────────────────
  // `origin` flows to the fetch and is discarded when this function returns —
  // `fetchSatelliteImage`'s result carries pixels + extent + attribution only.
  return fetchSatelliteImage(origin, framing, blobStore, signal)
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}
