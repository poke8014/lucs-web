import { describe, expect, it } from 'vitest'
import {
  annotationLabel,
  createAnnotation,
  isPointAnnotation,
  POINT_ANNOTATION_KINDS,
  POLYGON_ANNOTATION_KINDS,
} from './annotations'
import type { Annotation, Point, Polygon } from './types'

// ── createAnnotation ──────────────────────────────────────────────────────────

describe('createAnnotation', () => {
  it('creates an annotation with a unique id', () => {
    const a1 = createAnnotation('note', { x: 5, y: 10 })
    const a2 = createAnnotation('note', { x: 5, y: 10 })
    expect(a1.id).toBeTruthy()
    expect(a2.id).toBeTruthy()
    expect(a1.id).not.toBe(a2.id)
  })

  it('sets kind and geometry correctly', () => {
    const pt: Point = { x: 3, y: 7 }
    const a = createAnnotation('wet_spot', pt)
    expect(a.kind).toBe('wet_spot')
    expect(a.geometry).toEqual(pt)
  })

  it('includes note when provided', () => {
    const a = createAnnotation('note', { x: 0, y: 0 }, 'underground irrigation line')
    expect(a.note).toBe('underground irrigation line')
  })

  it('trims whitespace from notes', () => {
    const a = createAnnotation('note', { x: 0, y: 0 }, '  trim me  ')
    expect(a.note).toBe('trim me')
  })

  it('omits note when empty string', () => {
    const a = createAnnotation('note', { x: 0, y: 0 }, '')
    expect(a.note).toBeUndefined()
  })

  it('omits note when whitespace only', () => {
    const a = createAnnotation('hose_bib', { x: 1, y: 1 }, '   ')
    expect(a.note).toBeUndefined()
  })

  it('works with polygon geometry (utility kind)', () => {
    const poly: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ]
    const a = createAnnotation('utility', poly)
    expect(a.kind).toBe('utility')
    expect(Array.isArray(a.geometry)).toBe(true)
  })

  it('creates all five annotation kinds without errors', () => {
    const kinds: Annotation['kind'][] = [
      'wet_spot',
      'utility',
      'keeper_plant',
      'hose_bib',
      'note',
    ]
    const pt: Point = { x: 0, y: 0 }
    for (const kind of kinds) {
      expect(() => createAnnotation(kind, pt)).not.toThrow()
    }
  })
})

// ── annotationLabel ────────────────────────────────────────────────────────────

describe('annotationLabel', () => {
  it('returns label and icon for wet_spot', () => {
    const meta = annotationLabel('wet_spot')
    expect(meta.label).toBe('Wet spot')
    expect(meta.icon).toBe('💧')
  })

  it('returns label and icon for utility', () => {
    const meta = annotationLabel('utility')
    expect(meta.label).toBe('Utility')
    expect(meta.icon).toBe('⚡')
  })

  it('returns label and icon for keeper_plant', () => {
    const meta = annotationLabel('keeper_plant')
    expect(meta.label).toBe('Keeper plant')
    expect(meta.icon).toBe('🌳')
  })

  it('returns label and icon for hose_bib', () => {
    const meta = annotationLabel('hose_bib')
    expect(meta.label).toBe('Hose bib')
    expect(meta.icon).toBe('🚰')
  })

  it('returns label and icon for note', () => {
    const meta = annotationLabel('note')
    expect(meta.label).toBe('Note')
    expect(meta.icon).toBe('📝')
  })
})

// ── isPointAnnotation ─────────────────────────────────────────────────────────

describe('isPointAnnotation', () => {
  it('returns true for a point-geometry annotation', () => {
    const a = createAnnotation('hose_bib', { x: 3, y: 8 })
    expect(isPointAnnotation(a)).toBe(true)
  })

  it('returns false for a polygon-geometry annotation', () => {
    const poly: Polygon = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
    ]
    const a = createAnnotation('utility', poly)
    expect(isPointAnnotation(a)).toBe(false)
  })
})

// ── kind lists ────────────────────────────────────────────────────────────────

describe('POINT_ANNOTATION_KINDS / POLYGON_ANNOTATION_KINDS', () => {
  it('covers all five annotation kinds between the two lists', () => {
    const all = new Set([...POINT_ANNOTATION_KINDS, ...POLYGON_ANNOTATION_KINDS])
    const expected: Annotation['kind'][] = [
      'wet_spot',
      'utility',
      'keeper_plant',
      'hose_bib',
      'note',
    ]
    for (const kind of expected) {
      expect(all.has(kind)).toBe(true)
    }
  })

  it('has no overlap between point and polygon kind lists', () => {
    const pts = new Set(POINT_ANNOTATION_KINDS)
    for (const k of POLYGON_ANNOTATION_KINDS) {
      expect(pts.has(k)).toBe(false)
    }
  })
})
