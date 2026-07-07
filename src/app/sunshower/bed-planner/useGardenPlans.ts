'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createMemoryPlanStore,
  openPlanStore,
  type PlanStore,
  type StorageStatus,
} from './db'
import type { GardenPlan } from './types'

const SAVE_DEBOUNCE_MS = 400

// A default yard until the user calibrates one — a modest suburban bed area.
const DEFAULT_WIDTH_FT = 40
const DEFAULT_HEIGHT_FT = 30

/**
 * Factory for a blank plan. Sensible defaults: schema version 1, matching
 * created/updated timestamps, empty feature arrays, and a plain rectangular
 * base map (no image) with no obstructions. Callers pass the display name.
 */
export function createEmptyPlan(name: string): GardenPlan {
  const now = new Date().toISOString()
  return {
    version: 1,
    id: newId(),
    name,
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

/**
 * Duplicate a plan as a new document: fresh id, `forkedFrom` pointing at the
 * source, a derived name, and reset timestamps. Placement/section ids are kept
 * — they're only unique within a plan, and re-minting them would orphan the
 * cross-references (a placement's `sectionId`). The base-map `imageKey` is kept
 * so the fork shares the source's stored image until the user changes it.
 * One-tap forking is first-class (vault/concepts/bubble-drawing).
 */
export function forkPlan(source: GardenPlan): GardenPlan {
  const now = new Date().toISOString()
  return {
    ...source,
    id: newId(),
    name: derivedForkName(source.name),
    forkedFrom: source.id,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * "back fence bed" → "back fence bed (copy)"; a second fork of the same base
 * becomes "(copy 2)", etc. Kept deterministic and dumb — the UI can rename.
 */
export function derivedForkName(name: string): string {
  const copyMatch = name.match(/^(.*) \(copy(?: (\d+))?\)$/)
  if (copyMatch) {
    const base = copyMatch[1]
    const n = copyMatch[2] ? Number(copyMatch[2]) : 1
    return `${base} (copy ${n + 1})`
  }
  return `${name} (copy)`
}

/** Stamp `updatedAt` — every mutation flows through here so the field never lies. */
export function touchPlan(plan: GardenPlan): GardenPlan {
  return { ...plan, updatedAt: new Date().toISOString() }
}

/**
 * All reads and writes for the bed planner live behind this one client hook —
 * multiple named plans, one active plan, create / update (debounced) / delete /
 * fork. SSR-safe: the first render is empty, the store opens and hydrates in an
 * effect after mount (mirroring useSiteProfile). If IndexedDB is corrupt,
 * quota-limited, or unavailable the store transparently falls back to memory
 * and `storageStatus` flips to `'memory'` so the UI can show a "not saving"
 * notice. Nothing here is address- or location-aware (spec anti-goals).
 */
export function useGardenPlans() {
  const [plans, setPlans] = useState<GardenPlan[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('memory')

  // The live store, and per-plan debounce timers keyed by plan id.
  const storeRef = useRef<PlanStore>(createMemoryPlanStore())
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    // Open the store and hydrate once after mount — server and first client
    // render both show no plans, so they agree.
    let cancelled = false
    const timers = saveTimers.current
    void (async () => {
      const store = await openPlanStore()
      if (cancelled) return
      storeRef.current = store
      const existing = await store.getAllPlans().catch(() => [])
      if (cancelled) return
      setPlans(existing)
      setActiveId(existing[0]?.id ?? null)
      setStorageStatus(store.status)
      setHydrated(true)
    })()
    return () => {
      cancelled = true
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  // Debounced persist of a single plan; failures downgrade to a memory notice
  // rather than losing the in-state edit.
  const scheduleSave = useCallback((plan: GardenPlan) => {
    const timers = saveTimers.current
    const existing = timers.get(plan.id)
    if (existing) clearTimeout(existing)
    timers.set(
      plan.id,
      setTimeout(() => {
        timers.delete(plan.id)
        storeRef.current.putPlan(plan).catch(() => setStorageStatus('memory'))
      }, SAVE_DEBOUNCE_MS),
    )
  }, [])

  const createPlan = useCallback(
    (name: string) => {
      const plan = createEmptyPlan(name)
      setPlans((prev) => [...prev, plan])
      setActiveId(plan.id)
      scheduleSave(plan)
      return plan
    },
    [scheduleSave],
  )

  // Update the active plan (or a named one) via a patch or updater, restamping
  // `updatedAt` and scheduling a debounced write.
  const updatePlan = useCallback(
    (id: string, patch: Partial<GardenPlan> | ((plan: GardenPlan) => GardenPlan)) => {
      setPlans((prev) =>
        prev.map((plan) => {
          if (plan.id !== id) return plan
          const next = touchPlan(
            typeof patch === 'function' ? patch(plan) : { ...plan, ...patch },
          )
          scheduleSave(next)
          return next
        }),
      )
    },
    [scheduleSave],
  )

  const deletePlan = useCallback((id: string) => {
    const timer = saveTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      saveTimers.current.delete(id)
    }
    setPlans((prev) => {
      const next = prev.filter((plan) => plan.id !== id)
      setActiveId((current) => (current === id ? next[0]?.id ?? null : current))
      return next
    })
    storeRef.current.deletePlan(id).catch(() => setStorageStatus('memory'))
  }, [])

  // One-tap fork of an existing plan; the new plan becomes active.
  const fork = useCallback(
    (id: string) => {
      const source = plans.find((plan) => plan.id === id)
      if (!source) return null
      const copy = forkPlan(source)
      setPlans((prev) => [...prev, copy])
      setActiveId(copy.id)
      scheduleSave(copy)
      return copy
    },
    [plans, scheduleSave],
  )

  // Import a validated plan into the store as a new active document.
  const addPlan = useCallback(
    (plan: GardenPlan) => {
      setPlans((prev) => [...prev, plan])
      setActiveId(plan.id)
      scheduleSave(plan)
      return plan
    },
    [scheduleSave],
  )

  const activePlan = plans.find((plan) => plan.id === activeId) ?? null

  return {
    plans,
    activePlan,
    activeId,
    hydrated,
    storageStatus,
    setActiveId,
    createPlan,
    updatePlan,
    deletePlan,
    fork,
    addPlan,
    /** Direct access to the live store for blob (base-map image) reads/writes. */
    store: storeRef,
  }
}

/** crypto.randomUUID when available; a small fallback for older/test runtimes. */
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'plan-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
