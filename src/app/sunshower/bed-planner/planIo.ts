// JSON export/import for a single GardenPlan — the durability valve until auth
// (M7). Export serializes the plan document; the base-map image is either
// omitted (the default — export the geometry, not the megabytes) or inlined as
// a base64 data URL at the caller's choice. Import validates `version: 1` and
// the document shape, rejecting garbage with a typed result rather than a throw.

import type { GardenPlan } from './types'

export const EXPORT_KIND = 'sunshower.bedPlan'
export const EXPORT_VERSION = 1

/**
 * The on-disk export envelope. Wraps the plan so an importer can sanity-check
 * what it's looking at before trusting the shape, and so an optional inlined
 * base-map image travels alongside the (image-stripped) plan document.
 */
export interface PlanExport {
  kind: typeof EXPORT_KIND
  exportVersion: typeof EXPORT_VERSION
  plan: GardenPlan
  imageDataUrl?: string   // base64 data URL when the caller inlines the base map
}

export interface ExportOptions {
  /**
   * A base64 data URL for the base map, resolved by the caller from the blob
   * store (unit B owns the blob → data-URL step). When provided it's inlined and
   * `baseMap.imageKey` is preserved so re-import can re-key the restored blob.
   * When omitted, `imageKey` stays on the document but no image bytes ship.
   */
  imageDataUrl?: string
}

export type ImportResult =
  | { ok: true; plan: GardenPlan; imageDataUrl?: string }
  | { ok: false; error: ImportError }

export type ImportError =
  | 'not_json'          // string didn't parse as JSON
  | 'not_an_object'     // parsed to a non-object (array, number, null…)
  | 'unknown_kind'      // envelope present but not a sunshower bed plan
  | 'unsupported_version' // plan.version isn't 1
  | 'bad_shape'         // failed the structural check

/**
 * Serialize a plan to a pretty-printed JSON string ready to download. Pass
 * `{ imageDataUrl }` to inline the base map; omit it to export geometry only.
 */
export function exportPlan(plan: GardenPlan, options: ExportOptions = {}): string {
  const envelope: PlanExport = {
    kind: EXPORT_KIND,
    exportVersion: EXPORT_VERSION,
    plan,
  }
  if (options.imageDataUrl) envelope.imageDataUrl = options.imageDataUrl
  return JSON.stringify(envelope, null, 2)
}

/**
 * Parse and validate an exported plan string. Accepts either the wrapped
 * envelope (what `exportPlan` writes) or a bare GardenPlan document, so a plan
 * copied straight out of the store still imports. Returns a typed result;
 * never throws on bad input.
 */
export function importPlan(raw: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'not_json' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'not_an_object' }
  }

  const record = parsed as Record<string, unknown>

  // Envelope form: { kind, exportVersion, plan, imageDataUrl? }
  if ('kind' in record || 'plan' in record) {
    if (record.kind !== EXPORT_KIND) return { ok: false, error: 'unknown_kind' }
    return validatePlanValue(record.plan, readImageDataUrl(record))
  }

  // Bare-document form: the object itself should be a GardenPlan.
  return validatePlanValue(parsed, undefined)
}

function validatePlanValue(value: unknown, imageDataUrl: string | undefined): ImportResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'bad_shape' }
  }
  // Gate the version before the full structural check for a precise error.
  const version = (value as Record<string, unknown>).version
  if (version !== 1) return { ok: false, error: 'unsupported_version' }
  if (!isGardenPlanShaped(value)) return { ok: false, error: 'bad_shape' }
  return imageDataUrl
    ? { ok: true, plan: value, imageDataUrl }
    : { ok: true, plan: value }
}

function readImageDataUrl(record: Record<string, unknown>): string | undefined {
  return typeof record.imageDataUrl === 'string' ? record.imageDataUrl : undefined
}

/**
 * Structural guard for a GardenPlan — mirrors profile.ts's `isProfileShaped`
 * idiom: a shallow check of the load-bearing fields, not a deep schema. Enough
 * to reject foreign JSON and refuse to hydrate the store from garbage; the app
 * tolerates missing optional fields. Exported so the hook can reuse it when
 * reading persisted documents back.
 */
export function isGardenPlanShaped(value: unknown): value is GardenPlan {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string' &&
    isBaseMapShaped(v.baseMap) &&
    Array.isArray(v.paths) &&
    Array.isArray(v.sections) &&
    Array.isArray(v.placements) &&
    Array.isArray(v.annotations)
  )
}

function isBaseMapShaped(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.widthFt === 'number' &&
    typeof v.heightFt === 'number' &&
    Array.isArray(v.obstructions)
  )
}
