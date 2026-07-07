'use client'

// The persisted BlobStore — unit D's swap-in behind unit B's in-memory one. Same
// `BlobStore` interface (putImage / getImageUrl), so BaseMapStep never learns
// where the bytes live; it only ever sees keys and object-URLs (blobStore.ts).
//
// Bytes go to the plan store's `blobs` object store (db.ts `putBlob`/`getBlob`)
// via the live `storeRef` the hook hands back — one database for plans and their
// base-map images. Reads mint an object-URL and cache it per key so the on-ramp
// thumbnail and the canvas image layer share one URL and don't leak duplicates;
// the cache is revoked on `dispose()` at unmount.
//
// The store falls back to memory transparently (private mode, quota, corrupt
// IDB — db.ts), so this adapter needs no fallback of its own: it writes and reads
// through whatever backend the ref points at, and a persisted upload simply
// becomes session-only when the backing store is in memory.

import type { PlanStore } from './db'
import type { BlobStore } from './blobStore'
import { newId } from './plan'

/**
 * Build a BlobStore over the hook's live `storeRef`. The ref (not a snapshot) is
 * held so the adapter always writes through the current backend even though the
 * store swaps from memory to IDB once the async open in useGardenPlans resolves.
 */
export function createPersistentBlobStore(
  storeRef: { readonly current: PlanStore },
): BlobStore & { dispose: () => void } {
  // key → object-URL, minted lazily on first read and reused thereafter.
  const urls = new Map<string, string>()

  return {
    async putImage(blob: Blob): Promise<string> {
      const key = 'img-' + newId()
      await storeRef.current.putBlob(key, blob)
      // Seed the URL cache so an immediate getImageUrl for this key is free.
      urls.set(key, URL.createObjectURL(blob))
      return key
    },

    async getImageUrl(key: string): Promise<string | null> {
      const cached = urls.get(key)
      if (cached) return cached
      const blob = await storeRef.current.getBlob(key)
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      urls.set(key, url)
      return url
    },

    dispose() {
      for (const url of urls.values()) URL.revokeObjectURL(url)
      urls.clear()
    },
  }
}
