// Satellite on-ramp: geocode point → one bird's-eye raster the user traces over.
//
// PRIVACY CONTRACT (spec §Privacy, hard requirement / HANDOFF invariant 9): the
// lat/lng is used **once, in-session, here**, to build the provider URL — the
// same in-session exposure class as the Nominatim geocode. It is never returned
// to the caller and never persisted. `fetchSatelliteImage`'s public result
// carries raster pixels, feet extents, and an attribution string only — nothing
// machine-readable about location (no address, no coordinates, no tile coords,
// no provider URL). The `origin` lives in local variables and is discarded when
// the function returns.
//
// PROVIDER LADDER: `NEXT_PUBLIC_MAPBOX_TOKEN` non-empty → try Mapbox; on any
// Mapbox failure (or no token) fall through to keyless USGS NAIP; NAIP fails too
// → a friendly reason routing to the upload/rectangle on-ramps. Exactly one
// request per provider attempt — no retry loops (cost guard, spec §Cost guard).

import type { BlobStore } from './blobStore'

// ── Constants ────────────────────────────────────────────────────────────────

/** Web-Mercator ground resolution at the equator, zoom 0, for 512-px tiles
 *  (Mapbox GL convention). Halved per zoom level, scaled by cos(lat). */
const EQUATOR_M_PER_PX = 156543.03392
const M_TO_FT = 3.28084
/** WGS84 semi-major axis — the sphere radius EPSG:3857 (Web Mercator) uses. */
const EARTH_RADIUS_M = 6378137

const MAPBOX_STATIC = 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static'
const NAIP_EXPORT =
  'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage'

/** Logical request size, in px. The `@2x` retina suffix doubles the returned
 *  raster but NOT the ground extent — extent math always uses this value. */
const LOGICAL_PX = 1280
/** NAIP is 0.6 m/px; more pixels than this is empty upscaling. ArcGIS caps
 *  `size` at 4000px, so we stay well under. */
const NAIP_PX = 2000

const MAPBOX_ATTRIBUTION = '© Mapbox © OpenStreetMap © Maxar'
const NAIP_ATTRIBUTION = 'USGS, USDA — public domain'

// ── Framing presets ──────────────────────────────────────────────────────────

/** Small/large-yard toggle. Both render at 1280×1280 logical px; the zoom sets
 *  the ground extent (see FRAMINGS for the verified foot spans at ~37.3°N). */
export type Framing = 'small' | 'large'

export interface FramingPreset {
  zoom: number
  /** Logical px per side — the extent-math input, never the doubled raster. */
  logicalPx: number
}

/** small = zoom 20 (≈250 ft square at South Bay latitude), large = zoom 19
 *  (≈500 ft). The foot spans are latitude-dependent; verified at 37.3°N in the
 *  colocated test against `groundWidthFt`. */
export const FRAMINGS: Record<Framing, FramingPreset> = {
  small: { zoom: 20, logicalPx: LOGICAL_PX },
  large: { zoom: 19, logicalPx: LOGICAL_PX },
}

// ── Extent math (pure, exported, tested) ─────────────────────────────────────

/**
 * Web-Mercator ground resolution in meters per pixel at a given latitude and
 * zoom (Mapbox GL 512-px-tile convention: `2^(zoom+1)`).
 */
export function metersPerPixel(latDeg: number, zoom: number): number {
  const latRad = (latDeg * Math.PI) / 180
  return (EQUATOR_M_PER_PX * Math.cos(latRad)) / Math.pow(2, zoom + 1)
}

/**
 * Ground width in feet for a run of logical pixels. Uses the *logical* size
 * (1280), never the `@2x`-doubled raster — the retina suffix multiplies pixels,
 * not extent.
 */
export function groundWidthFt(logicalPx: number, latDeg: number, zoom: number): number {
  return logicalPx * metersPerPixel(latDeg, zoom) * M_TO_FT
}

/**
 * The true footprint of a fetched tile, in feet. Square framing, so width and
 * height are equal — but returned as a pair so the caller sets the plan
 * rectangle without re-deriving.
 */
export function framingExtentFt(
  origin: { lat: number },
  framing: Framing,
): { widthFt: number; heightFt: number } {
  const preset = FRAMINGS[framing]
  const side = groundWidthFt(preset.logicalPx, origin.lat, preset.zoom)
  return { widthFt: side, heightFt: side }
}

/** EPSG:3857 (Web Mercator) projection of a lat/lng, in meters. Used for the
 *  NAIP bbox so its ground extent matches the Mapbox framing exactly. */
export function toWebMercator(latDeg: number, lngDeg: number): { x: number; y: number } {
  const latRad = (latDeg * Math.PI) / 180
  const lngRad = (lngDeg * Math.PI) / 180
  return {
    x: EARTH_RADIUS_M * lngRad,
    y: EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + latRad / 2)),
  }
}

// ── URL builders (pure, exported, tested) ────────────────────────────────────

/**
 * Mapbox Static Images API, classic `satellite-v9`. Token is passed in (read
 * from env only in the orchestrator, so this stays pure). `@2x` for a crisp
 * trace surface; `attribution=false&logo=false` because we render our own
 * attribution chip (unit S3).
 */
export function mapboxUrl(
  origin: { lat: number; lng: number },
  framing: Framing,
  token: string,
): string {
  const { zoom, logicalPx } = FRAMINGS[framing]
  const size = `${logicalPx}x${logicalPx}@2x`
  const center = `${origin.lng},${origin.lat},${zoom}`
  return (
    `${MAPBOX_STATIC}/${center}/${size}` +
    `?attribution=false&logo=false&access_token=${token}`
  )
}

/**
 * USGS NAIP ImageServer `exportImage`. The bbox is the same ground extent as the
 * Mapbox framing (so the two providers are interchangeable), expressed in Web
 * Mercator (EPSG:3857). `bboxSR`/`imageSR` are both 3857 — no reprojection.
 * `size` capped at NAIP_PX (2000) since NAIP's 0.6 m/px makes more px empty
 * upscaling; ArcGIS's own hard cap is 4000.
 */
export function naipUrl(origin: { lat: number; lng: number }, framing: Framing): string {
  const { widthFt } = framingExtentFt(origin, framing)
  const halfM = widthFt / M_TO_FT / 2
  const center = toWebMercator(origin.lat, origin.lng)
  const bbox = [center.x - halfM, center.y - halfM, center.x + halfM, center.y + halfM].join(',')
  const params = new URLSearchParams({
    bbox,
    bboxSR: '3857',
    imageSR: '3857',
    size: `${NAIP_PX},${NAIP_PX}`,
    format: 'jpgpng',
    f: 'image',
  })
  return `${NAIP_EXPORT}?${params.toString()}`
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export type Provider = 'mapbox' | 'naip'

export interface SatelliteFetchSuccess {
  ok: true
  /** Key from `blobStore.putImage` — persist this on the plan, not the URL. */
  imageKey: string
  widthFt: number
  heightFt: number
  /** Rendered whenever the underlay shows (unit S3 chip). */
  attribution: string
  provider: Provider
}

export interface SatelliteFetchFailure {
  ok: false
  /** Friendly, user-facing reason — routes to the upload/rectangle on-ramps. */
  reason: string
}

export type SatelliteFetchResult = SatelliteFetchSuccess | SatelliteFetchFailure

/**
 * Fetch one satellite raster centered on `origin`, store it via `blobStore`, and
 * return its true feet extent + attribution. Resolves (never rejects) with a
 * tagged result so the caller has one path — mirrors `importAddress`.
 *
 * `origin` (lat/lng) is used only to build the provider URL and is discarded on
 * return; see the module PRIVACY CONTRACT.
 */
export async function fetchSatelliteImage(
  origin: { lat: number; lng: number },
  framing: Framing,
  blobStore: BlobStore,
  signal?: AbortSignal,
): Promise<SatelliteFetchResult> {
  const { widthFt, heightFt } = framingExtentFt(origin, framing)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()

  // ── Rung 1: Mapbox (only if a token is configured) ────────────────────────
  if (token) {
    try {
      const imageKey = await fetchToBlob(mapboxUrl(origin, framing, token), blobStore, signal)
      return { ok: true, imageKey, widthFt, heightFt, attribution: MAPBOX_ATTRIBUTION, provider: 'mapbox' }
    } catch (e) {
      if (isAbort(e)) return { ok: false, reason: 'Photo fetch cancelled.' }
      // fall through to NAIP — Mapbox failed, but the keyless rung might work
    }
  }

  // ── Rung 2: USGS NAIP (keyless fallback) ──────────────────────────────────
  try {
    const imageKey = await fetchToBlob(naipUrl(origin, framing), blobStore, signal)
    return { ok: true, imageKey, widthFt, heightFt, attribution: NAIP_ATTRIBUTION, provider: 'naip' }
  } catch (e) {
    if (isAbort(e)) return { ok: false, reason: 'Photo fetch cancelled.' }
    return {
      ok: false,
      reason:
        "Couldn't fetch a bird's-eye photo for that spot right now. Upload a screenshot or draw the yard by hand below — the result's the same either way.",
    }
  }
  // `origin` (lat/lng) goes out of scope here — nothing above it is persisted.
}

/** One GET → `res.blob()` → `blobStore.putImage`. One request, no retry. */
async function fetchToBlob(url: string, blobStore: BlobStore, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`imagery ${res.status}`)
  // ArcGIS can answer 200 with a JSON/HTML error body even when f=image —
  // storing that as the underlay would render a broken image. Insist on pixels.
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`imagery non-image response (${type || 'unknown'})`)
  const blob = await res.blob()
  return blobStore.putImage(blob)
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}
