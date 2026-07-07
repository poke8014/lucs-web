// A tiny image-store seam so the base-map step can hold an uploaded image today
// without knowing where it will live tomorrow. Unit A's IndexedDB `blobs` store
// (spec §Storage) swaps in behind this interface at the integration pass — the
// components only ever see keys and object-URLs, never the storage mechanism.

import { useEffect, useState } from 'react'

export interface BlobStore {
  /** Store an image blob, get back a stable key to persist on the plan. */
  putImage(blob: Blob): Promise<string>
  /** Resolve a key to a displayable URL, or null if the key is unknown. */
  getImageUrl(key: string): Promise<string | null>
}

/**
 * Resolve a blob key to a displayable URL, async and cancellation-safe. Returns
 * null while loading or when there's no key. Both the image on-ramp thumbnail
 * and the canvas image layer share this so they never diverge — and the null
 * case flows through the async callback, so there's no synchronous setState in
 * the effect body.
 */
export function useBlobUrl(key: string | undefined, store: BlobStore): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    const resolve = key ? store.getImageUrl(key) : Promise.resolve(null)
    resolve.then((u) => {
      if (live) setUrl(u)
    })
    return () => {
      live = false
    }
  }, [key, store])
  return url
}

/**
 * In-memory implementation: keeps blobs as object-URLs for the session. Good
 * enough for unit B (the image lives only while the tab is open); the real
 * persisted store lands with unit A's integration pass. Object-URLs are revoked
 * on `dispose()` to avoid leaking them across a long session.
 */
export function createMemoryBlobStore(): BlobStore & { dispose: () => void } {
  const urls = new Map<string, string>()
  let seq = 0

  return {
    async putImage(blob: Blob): Promise<string> {
      const key = `mem-${Date.now()}-${seq++}`
      urls.set(key, URL.createObjectURL(blob))
      return key
    },
    async getImageUrl(key: string): Promise<string | null> {
      return urls.get(key) ?? null
    },
    dispose() {
      for (const url of urls.values()) URL.revokeObjectURL(url)
      urls.clear()
    },
  }
}
