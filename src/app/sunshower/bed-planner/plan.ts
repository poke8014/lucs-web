// Local plan factory + tiny helpers for unit B.
//
// Persistence is unit A's job (`useGardenPlans`, IndexedDB). For now the
// workspace holds a plan in plain React state; this factory seeds a fresh one.
// When the integration pass lands, the workspace swaps `useState(defaultPlan)`
// for the hook and this file can shrink to just the pure helpers.

import type { GardenPlan } from './types'

// A comfortable default yard — 40×30 ft — so the canvas has something framed
// before the user picks an on-ramp. All three on-ramps overwrite it.
export const DEFAULT_WIDTH_FT = 40
export const DEFAULT_HEIGHT_FT = 30

function newId(): string {
  // crypto.randomUUID exists in modern browsers and Node 18+; the fallback
  // keeps SSR / older test envs from throwing.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function defaultPlan(): GardenPlan {
  const now = new Date().toISOString()
  return {
    version: 1,
    id: newId(),
    name: 'Untitled plan',
    createdAt: now,
    updatedAt: now,
    baseMap: {
      widthFt: DEFAULT_WIDTH_FT,
      heightFt: DEFAULT_HEIGHT_FT,
      obstructions: [],
    },
    paths: [],
    sections: [],
    placements: [],
    annotations: [],
  }
}

export { newId }
