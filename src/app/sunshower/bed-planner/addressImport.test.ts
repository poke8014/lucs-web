import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importAddress } from './addressImport'
import type { BlobStore } from './blobStore'

// A tiny in-memory BlobStore stub — putImage hands back a fixed key, getImageUrl
// is never exercised on this path. Mirrors satelliteFetch.test.ts's stubStore.
const stubStore: BlobStore = {
  async putImage() {
    return 'img-key-1'
  },
  async getImageUrl() {
    return null
  },
}

// A geocode hit shaped like Nominatim's JSON (lat/lon as strings).
const geocodeHit = () =>
  ({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => [{ lat: '37.3', lon: '-121.9' }],
  }) as unknown as Response

// An imagery response the fetcher accepts — it insists on an image/* body.
const imageResponse = () =>
  ({
    ok: true,
    headers: new Headers({ 'content-type': 'image/png' }),
    blob: async () => new Blob(['x']),
  }) as unknown as Response

// No Mapbox token → the imagery ladder uses the keyless NAIP rung, so a single
// geocode + single imagery fetch is the whole happy path.
beforeEach(() => {
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('importAddress — empty input', () => {
  it('returns a friendly failure without ever fetching', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const result = await importAddress('   ', 'small', stubStore)
    expect(result).toEqual({ ok: false, reason: 'Type an address to fetch a photo of.' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('importAddress — geocode failures', () => {
  it('reports "Couldn\'t find that address" on an empty hits array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [] }) as unknown as Response),
    )
    const result = await importAddress('nowhere at all', 'small', stubStore)
    expect(result).toEqual({
      ok: false,
      reason: "Couldn't find that address. Try adding city + state, or trace it by hand below.",
    })
  })

  it('reports a friendly failure on a geocode network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down')
      }),
    )
    const result = await importAddress('123 Main St', 'small', stubStore)
    expect(result).toEqual({
      ok: false,
      reason: "Couldn't reach the address lookup. Try again, or trace it by hand.",
    })
  })
})

describe('importAddress — geocode → imagery success', () => {
  it('geocodes then fetches, returning imageKey + extent + attribution', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        return calls.length === 1 ? geocodeHit() : imageResponse()
      }),
    )
    const result = await importAddress('123 Main St, San Jose, CA', 'small', stubStore)
    expect(result).toMatchObject({
      ok: true,
      imageKey: 'img-key-1',
      provider: 'naip',
      attribution: 'USGS, USDA — public domain',
    })
    if (result.ok) {
      expect(result.widthFt).toBeGreaterThan(0)
      expect(result.heightFt).toBeGreaterThan(0)
    }
    // One geocode call, then one imagery call.
    expect(calls).toHaveLength(2)
    expect(calls[0]).toContain('nominatim.openstreetmap.org')
    expect(calls[1]).toContain('nationalmap.gov')
  })

  it('a success result carries NO location fields (privacy contract)', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls.push('x')
        return calls.length === 1 ? geocodeHit() : imageResponse()
      }),
    )
    const result = await importAddress('123 Main St, San Jose, CA', 'small', stubStore)
    expect(result.ok).toBe(true)
    // The exact, whole key set — no lat, lng, address, origin, url, or coords.
    expect(Object.keys(result).sort()).toEqual(
      ['attribution', 'heightFt', 'imageKey', 'ok', 'provider', 'widthFt'].sort(),
    )
  })
})

describe('importAddress — abort', () => {
  it('short-circuits with a cancelled reason when the geocode is aborted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('aborted', 'AbortError')
      }),
    )
    const result = await importAddress('123 Main St', 'small', stubStore)
    expect(result).toEqual({ ok: false, reason: 'Import cancelled.' })
  })
})
