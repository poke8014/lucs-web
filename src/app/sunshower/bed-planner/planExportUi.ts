'use client'

// Browser-side glue for the Export/Import JSON affordances in the plan strip
// (unit I, §3). The pure serialize/validate logic lives in planIo.ts; this file
// is the small amount of DOM/Blob plumbing that can't be pure: reading a file,
// turning a stored base-map Blob into a data URL (with a size gate), and kicking
// off a browser download.

import { exportPlan, importPlan, type ImportError, type ImportResult } from './planIo'
import type { PlanStore } from './db'
import type { GardenPlan } from './types'

// Inline the base map only when it's small — geometry is the point; megabytes of
// image aren't. Above this the export omits the image and the caller says so.
export const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

export interface ExportBuildResult {
  json: string
  /** True when a base-map image existed but was too big to inline. */
  imageOmitted: boolean
}

/**
 * Build the export JSON for a plan, inlining the base-map image as a data URL
 * when one exists and it's under the size cap. Reads the Blob through the store
 * (imageKey → Blob → data URL). Never throws — a missing/unreadable image just
 * exports geometry only.
 */
export async function buildPlanExport(
  plan: GardenPlan,
  store: PlanStore,
): Promise<ExportBuildResult> {
  const key = plan.baseMap.imageKey
  if (!key) return { json: exportPlan(plan), imageOmitted: false }

  let blob: Blob | undefined
  try {
    blob = await store.getBlob(key)
  } catch {
    blob = undefined
  }
  if (!blob) return { json: exportPlan(plan), imageOmitted: false }

  if (blob.size > MAX_INLINE_IMAGE_BYTES) {
    // Too big to travel inline — export geometry only and tell the caller.
    return { json: exportPlan(plan), imageOmitted: true }
  }

  const imageDataUrl = await blobToDataUrl(blob)
  return { json: exportPlan(plan, { imageDataUrl }), imageOmitted: false }
}

/** Trigger a browser download of `json` as `<filename>.json`. */
export function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the click a tick before revoking so the download starts.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** A filesystem-friendly filename from a plan name ("v3 — moved path" → "v3-moved-path"). */
export function planFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `sunshower-plan-${slug || 'plan'}`
}

/** Read a File's text and parse+validate it as a plan. Never throws. */
export async function readImportedFile(file: File): Promise<ImportResult> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: 'not_json' }
  }
  return importPlan(text)
}

/** Human-friendly, invitation-not-scold copy for each import failure mode. */
export function importErrorMessage(error: ImportError): string {
  switch (error) {
    case 'not_json':
      return "That file didn't read as a plan — it should be a .json you exported from here."
    case 'not_an_object':
    case 'bad_shape':
      return "This doesn't look like a Sunshower plan file. Try exporting one first to see the shape."
    case 'unknown_kind':
      return "That's JSON, but not a Sunshower bed plan. No harm done — pick a plan file and try again."
    case 'unsupported_version':
      return 'That plan was made with a different version. Nothing lost — it just needs a matching build.'
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
