// Annotation helpers — unit G, module 5.
//
// Tiny helpers for creating and labelling Annotations (the knowns-worth-drawing
// that aren't plants: wet_spot, utility, keeper_plant, hose_bib, note). All
// presentation-side logic lives in AnnotationLayer / AnnotationTools; this
// module is pure and unit-tested.

import type { Annotation, Point, Polygon } from './types'
import { newId } from './plan'

// ── createAnnotation ───────────────────────────────────────────────────────────

/**
 * Create a new Annotation with a fresh id.
 * @param kind    one of the five annotation kinds
 * @param geometry  a Point (for point kinds) or Polygon (for area kinds)
 * @param note    optional free-text note
 */
export function createAnnotation(
  kind: Annotation['kind'],
  geometry: Point | Polygon,
  note?: string,
): Annotation {
  const a: Annotation = { id: newId(), kind, geometry }
  if (note !== undefined && note.trim() !== '') a.note = note.trim()
  return a
}

// ── annotationLabel ────────────────────────────────────────────────────────────

export interface AnnotationMeta {
  /** Short display name shown in the toolbar and on the canvas marker. */
  label: string
  /**
   * Emoji/icon character rendered on the map marker and in the kind picker.
   * Chosen to be legible at small sizes (16–20 px).
   */
  icon: string
}

const ANNOTATION_META: Record<Annotation['kind'], AnnotationMeta> = {
  wet_spot: { label: 'Wet spot', icon: '💧' },
  utility: { label: 'Utility', icon: '⚡' },
  keeper_plant: { label: 'Keeper plant', icon: '🌳' },
  hose_bib: { label: 'Hose bib', icon: '🚰' },
  note: { label: 'Note', icon: '📝' },
}

/**
 * Friendly display name + icon for an annotation kind.
 * Returns { label, icon } for use in toolbars, legends, and marker labels.
 */
export function annotationLabel(kind: Annotation['kind']): AnnotationMeta {
  return ANNOTATION_META[kind]
}

// ── isPointAnnotation ─────────────────────────────────────────────────────────

/**
 * True when an annotation's geometry is a Point (not a Polygon). The
 * discriminant is whether the geometry is an object with `x`/`y` vs. an array.
 */
export function isPointAnnotation(a: Annotation): a is Annotation & { geometry: Point } {
  return !Array.isArray(a.geometry)
}

// ── POINT_ANNOTATION_KINDS / POLYGON_ANNOTATION_KINDS ─────────────────────────

/**
 * The kinds that default to a single-point placement. Unit I uses this to
 * decide whether a canvas tap creates a point or starts a polygon trace.
 */
export const POINT_ANNOTATION_KINDS: Annotation['kind'][] = [
  'wet_spot',
  'hose_bib',
  'keeper_plant',
  'note',
]

/**
 * The kinds that default to a polygon (area) placement — only `utility` for
 * now (e.g. a utility-line corridor).
 */
export const POLYGON_ANNOTATION_KINDS: Annotation['kind'][] = ['utility']
