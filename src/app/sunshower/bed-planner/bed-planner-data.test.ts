import { describe, expect, it } from 'vitest'
import { createMemoryPlanStore } from './db'
import {
  EXPORT_KIND,
  EXPORT_VERSION,
  exportPlan,
  importPlan,
  isGardenPlanShaped,
} from './planIo'
import { createEmptyPlan, derivedForkName, forkPlan, touchPlan } from './useGardenPlans'
import type { GardenPlan } from './types'

// A sample plan with one obstruction and one placement, so round-trips exercise
// nested geometry rather than an empty shell.
function samplePlan(name = 'v1 — first pass'): GardenPlan {
  const plan = createEmptyPlan(name)
  plan.baseMap.obstructions.push({
    id: 'ob1',
    kind: 'building',
    footprint: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
      { x: 0, y: 8 },
    ],
    heightFt: 22,
  })
  plan.sections.push({
    id: 'sec1',
    name: 'back fence bed',
    polygon: [
      { x: 12, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 20 },
      { x: 12, y: 20 },
    ],
    labels: {},
    phaseState: 'untouched',
  })
  plan.placements.push({
    kind: 'individual',
    id: 'p1',
    sectionId: 'sec1',
    plantSlug: 'quercus-agrifolia',
    layerRole: 'structural',
    center: { x: 20, y: 10 },
  })
  return plan
}

describe('createEmptyPlan', () => {
  it('produces a valid, versioned, empty plan with a default base map', () => {
    const plan = createEmptyPlan('fresh')
    expect(plan.version).toBe(1)
    expect(plan.name).toBe('fresh')
    expect(plan.id).toBeTruthy()
    expect(plan.createdAt).toBe(plan.updatedAt)
    expect(plan.baseMap.widthFt).toBe(40)
    expect(plan.baseMap.heightFt).toBe(30)
    expect(plan.baseMap.obstructions).toEqual([])
    expect(plan.paths).toEqual([])
    expect(plan.sections).toEqual([])
    expect(plan.placements).toEqual([])
    expect(plan.annotations).toEqual([])
    expect(isGardenPlanShaped(plan)).toBe(true)
  })

  it('stores no address, lat/lng, or parcel id (privacy anti-goal)', () => {
    const json = JSON.stringify(createEmptyPlan('x'))
    expect(json).not.toMatch(/latLng|lat\b|lng|address|parcel/i)
  })
})

describe('export / import round-trip', () => {
  it('round-trips a plan without an inlined image', () => {
    const plan = samplePlan()
    const json = exportPlan(plan)
    const parsed = JSON.parse(json)
    expect(parsed.kind).toBe(EXPORT_KIND)
    expect(parsed.exportVersion).toBe(EXPORT_VERSION)
    expect(parsed.imageDataUrl).toBeUndefined()

    const result = importPlan(json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.plan).toEqual(plan)
      expect(result.imageDataUrl).toBeUndefined()
    }
  })

  it('round-trips a plan with an inlined base64 image', () => {
    const plan = samplePlan()
    plan.baseMap.imageKey = 'blob-abc'
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
    const json = exportPlan(plan, { imageDataUrl: dataUrl })

    const result = importPlan(json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.plan).toEqual(plan)
      expect(result.imageDataUrl).toBe(dataUrl)
      // imageKey survives so the restored blob can be re-keyed.
      expect(result.plan.baseMap.imageKey).toBe('blob-abc')
    }
  })

  it('accepts a bare GardenPlan document (no envelope)', () => {
    const plan = samplePlan()
    const result = importPlan(JSON.stringify(plan))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.plan).toEqual(plan)
  })
})

describe('import validation', () => {
  it('rejects non-JSON', () => {
    const result = importPlan('{not json')
    expect(result).toEqual({ ok: false, error: 'not_json' })
  })

  it('rejects JSON that is not an object', () => {
    expect(importPlan('42')).toEqual({ ok: false, error: 'not_an_object' })
    expect(importPlan('[1,2,3]')).toEqual({ ok: false, error: 'not_an_object' })
    expect(importPlan('null')).toEqual({ ok: false, error: 'not_an_object' })
  })

  it('rejects a foreign envelope kind', () => {
    const json = JSON.stringify({ kind: 'something.else', plan: samplePlan() })
    expect(importPlan(json)).toEqual({ ok: false, error: 'unknown_kind' })
  })

  it('rejects an unsupported version', () => {
    const plan = { ...samplePlan(), version: 2 }
    const json = JSON.stringify({ kind: EXPORT_KIND, exportVersion: 1, plan })
    expect(importPlan(json)).toEqual({ ok: false, error: 'unsupported_version' })
  })

  it('rejects a version-1 object with the wrong shape', () => {
    const json = JSON.stringify({ version: 1, id: 'x' }) // missing everything else
    expect(importPlan(json)).toEqual({ ok: false, error: 'bad_shape' })
  })
})

describe('fork semantics', () => {
  it('mints a new id, sets forkedFrom, derives the name, resets timestamps', () => {
    const source = touchPlan(samplePlan('back fence bed'))
    const fork = forkPlan(source)
    expect(fork.id).not.toBe(source.id)
    expect(fork.forkedFrom).toBe(source.id)
    expect(fork.name).toBe('back fence bed (copy)')
    expect(fork.createdAt).toBe(fork.updatedAt)
    // Content is carried over verbatim (sections, placements, obstructions).
    expect(fork.sections).toEqual(source.sections)
    expect(fork.placements).toEqual(source.placements)
    expect(fork.baseMap).toEqual(source.baseMap)
  })

  it('increments the copy suffix on repeated forks', () => {
    expect(derivedForkName('bed')).toBe('bed (copy)')
    expect(derivedForkName('bed (copy)')).toBe('bed (copy 2)')
    expect(derivedForkName('bed (copy 2)')).toBe('bed (copy 3)')
  })

  it('a fork is itself a valid, importable plan', () => {
    const fork = forkPlan(samplePlan())
    expect(isGardenPlanShaped(fork)).toBe(true)
    const result = importPlan(exportPlan(fork))
    expect(result.ok).toBe(true)
  })
})

describe('touchPlan', () => {
  it('advances updatedAt without touching createdAt or id', () => {
    const plan = createEmptyPlan('x')
    const touched = touchPlan({ ...plan, updatedAt: '2000-01-01T00:00:00.000Z' })
    expect(touched.updatedAt).not.toBe('2000-01-01T00:00:00.000Z')
    expect(touched.createdAt).toBe(plan.createdAt)
    expect(touched.id).toBe(plan.id)
  })
})

describe('in-memory store (fallback backend)', () => {
  it('reports memory status', () => {
    expect(createMemoryPlanStore().status).toBe('memory')
  })

  it('round-trips plans through put / getAll / get / delete', async () => {
    const store = createMemoryPlanStore()
    const a = samplePlan('a')
    const b = samplePlan('b')

    await store.putPlan(a)
    await store.putPlan(b)
    const all = await store.getAllPlans()
    expect(all).toHaveLength(2)
    expect(all.map((p) => p.name).sort()).toEqual(['a', 'b'])

    const got = await store.getPlan(a.id)
    expect(got).toEqual(a)

    await store.deletePlan(a.id)
    expect(await store.getPlan(a.id)).toBeUndefined()
    expect(await store.getAllPlans()).toHaveLength(1)
  })

  it('clones on read so callers cannot mutate the backing store', async () => {
    const store = createMemoryPlanStore()
    const plan = samplePlan('mutate me')
    await store.putPlan(plan)

    const first = await store.getPlan(plan.id)
    first!.name = 'tampered'
    const second = await store.getPlan(plan.id)
    expect(second!.name).toBe('mutate me')
  })

  it('round-trips blobs through put / get / delete', async () => {
    const store = createMemoryPlanStore()
    const blob = new Blob(['hello'], { type: 'text/plain' })
    await store.putBlob('key1', blob)
    expect(await store.getBlob('key1')).toBe(blob)

    await store.deleteBlob('key1')
    expect(await store.getBlob('key1')).toBeUndefined()
  })

  it('returns undefined for missing keys', async () => {
    const store = createMemoryPlanStore()
    expect(await store.getPlan('nope')).toBeUndefined()
    expect(await store.getBlob('nope')).toBeUndefined()
  })
})
