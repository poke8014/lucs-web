import { describe, expect, it } from 'vitest'
import {
  FRAMINGS,
  fetchSatelliteImage,
  framingExtentFt,
  groundWidthFt,
  mapboxUrl,
  metersPerPixel,
  naipUrl,
  toWebMercator,
} from './satelliteFetch'

const SOUTH_BAY = { lat: 37.3, lng: -121.9 }

describe('metersPerPixel', () => {
  it('gives the equator zoom-0 resolution for the 512-tile convention', () => {
    // 156543.03392 / 2^1 = 78271.51696 m/px at lat 0, zoom 0.
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.51696, 3)
  })

  it('halves per zoom level and scales by cos(lat)', () => {
    expect(metersPerPixel(0, 20)).toBeCloseTo(metersPerPixel(0, 19) / 2, 8)
    // at 37.3°N the ground shrinks by cos(37.3°)
    const ratio = metersPerPixel(37.3, 20) / metersPerPixel(0, 20)
    expect(ratio).toBeCloseTo(Math.cos((37.3 * Math.PI) / 180), 8)
  })
})

describe('framing extent at South Bay latitude (~37.3°N)', () => {
  it('small yard = zoom 20 ≈ 250 ft square', () => {
    expect(FRAMINGS.small.zoom).toBe(20)
    const { widthFt, heightFt } = framingExtentFt(SOUTH_BAY, 'small')
    expect(widthFt).toBeCloseTo(249.4, 1)
    expect(heightFt).toBe(widthFt) // square framing
  })

  it('large yard = zoom 19 ≈ 500 ft square', () => {
    expect(FRAMINGS.large.zoom).toBe(19)
    const { widthFt } = framingExtentFt(SOUTH_BAY, 'large')
    expect(widthFt).toBeCloseTo(498.7, 1)
  })

  it('always frames at 1280 logical px, never the doubled raster', () => {
    expect(FRAMINGS.small.logicalPx).toBe(1280)
    expect(FRAMINGS.large.logicalPx).toBe(1280)
  })
})

describe('groundWidthFt', () => {
  it('converts logical px → feet via meters-per-pixel × 3.28084', () => {
    const expected = 1280 * metersPerPixel(37.3, 20) * 3.28084
    expect(groundWidthFt(1280, 37.3, 20)).toBeCloseTo(expected, 6)
  })

  it('scales linearly with the logical pixel count (extent uses logical, not @2x)', () => {
    // 2560 logical px would be twice the extent — but 1280@2x (a 2560-px raster
    // at the logical size) must NOT: the presets always pass 1280.
    expect(groundWidthFt(2560, 37.3, 20)).toBeCloseTo(2 * groundWidthFt(1280, 37.3, 20), 6)
  })
})

describe('toWebMercator (EPSG:3857)', () => {
  it('maps the origin to (0, 0)', () => {
    const { x, y } = toWebMercator(0, 0)
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(0, 6)
  })

  it('spot-checks a known South Bay point', () => {
    const { x, y } = toWebMercator(37.3, -121.9)
    expect(x).toBeCloseTo(-13569845.9277, 3)
    expect(y).toBeCloseTo(4481005.8229, 3)
  })

  it('is antisymmetric in longitude and monotonic in latitude', () => {
    expect(toWebMercator(0, 121.9).x).toBeCloseTo(-toWebMercator(0, -121.9).x, 6)
    expect(toWebMercator(40, 0).y).toBeGreaterThan(toWebMercator(20, 0).y)
  })
})

describe('mapboxUrl', () => {
  it('builds the classic satellite-v9 static URL with @2x and token placement', () => {
    const url = mapboxUrl(SOUTH_BAY, 'small', 'pk.test')
    expect(url).toBe(
      'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/' +
        '-121.9,37.3,20/1280x1280@2x' +
        '?attribution=false&logo=false&access_token=pk.test',
    )
  })

  it('encodes the large-yard zoom', () => {
    expect(mapboxUrl(SOUTH_BAY, 'large', 'pk.test')).toContain('-121.9,37.3,19/1280x1280@2x')
  })

  it('suppresses Mapbox attribution + logo (we render our own chip)', () => {
    const url = mapboxUrl(SOUTH_BAY, 'small', 'pk.test')
    expect(url).toContain('attribution=false')
    expect(url).toContain('logo=false')
  })
})

describe('naipUrl', () => {
  it('builds the exportImage URL with a Web-Mercator bbox and 3857 SRs', () => {
    const url = new URL(naipUrl(SOUTH_BAY, 'small'))
    expect(url.origin + url.pathname).toBe(
      'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage',
    )
    expect(url.searchParams.get('bboxSR')).toBe('3857')
    expect(url.searchParams.get('imageSR')).toBe('3857')
    expect(url.searchParams.get('f')).toBe('image')
    expect(url.searchParams.get('format')).toBe('jpgpng')
  })

  it('caps size at 2000px (NAIP is 0.6 m/px; ArcGIS hard cap is 4000)', () => {
    const size = new URL(naipUrl(SOUTH_BAY, 'small')).searchParams.get('size')!
    expect(size).toBe('2000,2000')
  })

  it('produces the same ground extent as the Mapbox framing (providers interchangeable)', () => {
    // The bbox side in meters must equal the framing's foot extent / 3.28084.
    const bbox = new URL(naipUrl(SOUTH_BAY, 'small')).searchParams.get('bbox')!
    const [minX, minY, maxX, maxY] = bbox.split(',').map(Number)
    const sideM = maxX - minX
    expect(maxY - minY).toBeCloseTo(sideM, 6) // square
    const { widthFt } = framingExtentFt(SOUTH_BAY, 'small')
    expect(sideM).toBeCloseTo(widthFt / 3.28084, 4)
  })

  it('centers the bbox on the point in Web Mercator', () => {
    const bbox = new URL(naipUrl(SOUTH_BAY, 'small')).searchParams.get('bbox')!
    const [minX, minY, maxX, maxY] = bbox.split(',').map(Number)
    const center = toWebMercator(SOUTH_BAY.lat, SOUTH_BAY.lng)
    expect((minX + maxX) / 2).toBeCloseTo(center.x, 3)
    expect((minY + maxY) / 2).toBeCloseTo(center.y, 3)
  })
})

// The orchestrator's network path is not the required coverage; these light
// stub-fetch tests just pin the provider ladder and abort short-circuit.
describe('fetchSatelliteImage (ladder, stubbed fetch)', () => {
  const stubStore = {
    async putImage() {
      return 'key-1'
    },
    async getImageUrl() {
      return null
    },
  }

  const okResponse = () =>
    ({
      ok: true,
      headers: new Headers({ 'content-type': 'image/png' }),
      blob: async () => new Blob(['x']),
    }) as unknown as Response

  it('falls back to NAIP when no Mapbox token is set', async () => {
    const prev = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const calls: string[] = []
    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string) => {
      calls.push(url)
      return okResponse()
    }) as typeof fetch
    try {
      const result = await fetchSatelliteImage(SOUTH_BAY, 'small', stubStore)
      expect(result).toMatchObject({ ok: true, provider: 'naip', imageKey: 'key-1' })
      expect(calls).toHaveLength(1) // one request, no retry
      expect(calls[0]).toContain('nationalmap.gov')
    } finally {
      globalThis.fetch = origFetch
      if (prev !== undefined) process.env.NEXT_PUBLIC_MAPBOX_TOKEN = prev
    }
  })

  it('uses Mapbox first when a token is set, and carries its attribution', async () => {
    const prev = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test'
    const calls: string[] = []
    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string) => {
      calls.push(url)
      return okResponse()
    }) as typeof fetch
    try {
      const result = await fetchSatelliteImage(SOUTH_BAY, 'small', stubStore)
      expect(result).toMatchObject({
        ok: true,
        provider: 'mapbox',
        attribution: '© Mapbox © OpenStreetMap © Maxar',
      })
      expect(calls).toHaveLength(1)
      expect(calls[0]).toContain('api.mapbox.com')
    } finally {
      globalThis.fetch = origFetch
      if (prev !== undefined) process.env.NEXT_PUBLIC_MAPBOX_TOKEN = prev
      else delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    }
  })

  it('short-circuits with a cancelled reason on abort', async () => {
    const prev = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const origFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new DOMException('aborted', 'AbortError')
    }) as typeof fetch
    try {
      const result = await fetchSatelliteImage(SOUTH_BAY, 'small', stubStore)
      expect(result).toEqual({ ok: false, reason: 'Photo fetch cancelled.' })
    } finally {
      globalThis.fetch = origFetch
      if (prev !== undefined) process.env.NEXT_PUBLIC_MAPBOX_TOKEN = prev
    }
  })
})
