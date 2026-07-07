// Thin, hand-rolled promise wrapper over IndexedDB — no dependency (the spec
// caps this at ~1KB, idb-keyval-class). Database `sunshower`, two object stores:
//   `plans` — GardenPlan JSON documents keyed by `id`
//   `blobs` — base-map images (Blob) keyed by an arbitrary string (imageKey)
//
// The store backend is expressed as an injectable `PlanStore` interface so the
// pure hook logic (useGardenPlans) can run against an in-memory fake in tests —
// vitest runs in Node with no IndexedDB, and the spec forbids fake-indexeddb.
// `openPlanStore()` returns the real IndexedDB-backed implementation in the
// browser and a memory-backed one everywhere else (SSR, tests, unavailable IDB).

import type { GardenPlan } from './types'

export const DB_NAME = 'sunshower'
export const DB_VERSION = 1
export const PLANS_STORE = 'plans'
export const BLOBS_STORE = 'blobs'

/** How the store is currently persisting. Surfaced to the UI as a "not saving" notice. */
export type StorageStatus = 'idb' | 'memory'

/**
 * The storage seam. Every read/write the hook performs goes through one of
 * these methods, so swapping the real backend for an in-memory one is total.
 * All methods are async; the memory backend just resolves immediately.
 */
export interface PlanStore {
  readonly status: StorageStatus
  getAllPlans(): Promise<GardenPlan[]>
  getPlan(id: string): Promise<GardenPlan | undefined>
  putPlan(plan: GardenPlan): Promise<void>
  deletePlan(id: string): Promise<void>
  putBlob(key: string, blob: Blob): Promise<void>
  getBlob(key: string): Promise<Blob | undefined>
  deleteBlob(key: string): Promise<void>
}

// ---- in-memory backend ----------------------------------------------------

/**
 * Fully functional store that keeps everything in Maps. Used as the SSR/test
 * backend and as the runtime fallback when IndexedDB is corrupt, quota-limited,
 * or unavailable (private mode, disabled storage). Reports `status: 'memory'`.
 */
export function createMemoryPlanStore(): PlanStore {
  const plans = new Map<string, GardenPlan>()
  const blobs = new Map<string, Blob>()
  return {
    status: 'memory',
    async getAllPlans() {
      // Return clones so callers can't mutate our backing store in place.
      return [...plans.values()].map(clonePlan)
    },
    async getPlan(id) {
      const found = plans.get(id)
      return found ? clonePlan(found) : undefined
    },
    async putPlan(plan) {
      plans.set(plan.id, clonePlan(plan))
    },
    async deletePlan(id) {
      plans.delete(id)
    },
    async putBlob(key, blob) {
      blobs.set(key, blob)
    },
    async getBlob(key) {
      return blobs.get(key)
    },
    async deleteBlob(key) {
      blobs.delete(key)
    },
  }
}

// ---- IndexedDB backend ----------------------------------------------------

/**
 * Opens (creating/upgrading if needed) the `sunshower` database and returns an
 * IndexedDB-backed PlanStore. Rejects if IndexedDB is missing or the open
 * fails; `openPlanStore()` catches that and falls back to memory.
 */
export function createIdbPlanStore(): Promise<PlanStore> {
  return openDatabase().then((db) => idbStore(db))
}

/**
 * The store factory the hook calls. Tries IndexedDB in the browser; on any
 * failure (or outside the browser) resolves to a memory store. Never rejects —
 * callers always get a working store, and read `.status` to decide whether to
 * show the "not saving" notice.
 */
export async function openPlanStore(): Promise<PlanStore> {
  if (typeof indexedDB === 'undefined') return createMemoryPlanStore()
  try {
    return await createIdbPlanStore()
  } catch {
    return createMemoryPlanStore()
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (err) {
      reject(err)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PLANS_STORE)) {
        db.createObjectStore(PLANS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        // Blobs are keyed out-of-line by the imageKey string the caller supplies.
        db.createObjectStore(BLOBS_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('sunshower db open blocked'))
  })
}

function idbStore(db: IDBDatabase): PlanStore {
  return {
    status: 'idb',
    getAllPlans() {
      return runRequest<GardenPlan[]>(db, PLANS_STORE, 'readonly', (store) =>
        store.getAll(),
      )
    },
    getPlan(id) {
      return runRequest<GardenPlan | undefined>(
        db,
        PLANS_STORE,
        'readonly',
        (store) => store.get(id),
      )
    },
    putPlan(plan) {
      return runRequest<void>(db, PLANS_STORE, 'readwrite', (store) =>
        store.put(plan),
      )
    },
    deletePlan(id) {
      return runRequest<void>(db, PLANS_STORE, 'readwrite', (store) =>
        store.delete(id),
      )
    },
    putBlob(key, blob) {
      return runRequest<void>(db, BLOBS_STORE, 'readwrite', (store) =>
        store.put(blob, key),
      )
    },
    getBlob(key) {
      return runRequest<Blob | undefined>(db, BLOBS_STORE, 'readonly', (store) =>
        store.get(key),
      )
    },
    deleteBlob(key) {
      return runRequest<void>(db, BLOBS_STORE, 'readwrite', (store) =>
        store.delete(key),
      )
    },
  }
}

/**
 * Runs one IndexedDB request inside a transaction and resolves with its result.
 * A tiny helper so every store method above is a one-liner. Writes resolve on
 * the request's success (the transaction commits right after).
 */
function runRequest<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let request: IDBRequest
    try {
      const tx = db.transaction(storeName, mode)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('sunshower tx aborted'))
      request = op(tx.objectStore(storeName))
    } catch (err) {
      reject(err)
      return
    }
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(request.error)
  })
}

/** Structured deep clone with a manual fallback for older runtimes. */
function clonePlan(plan: GardenPlan): GardenPlan {
  if (typeof structuredClone === 'function') return structuredClone(plan)
  return JSON.parse(JSON.stringify(plan)) as GardenPlan
}
