'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addOrUpdate,
  emptyList,
  entryFor,
  loadList,
  removeEntry,
  saveList,
  setStatus,
  setZone,
  type PlantList,
  type PlantListEntry,
  type PlantListStatus,
} from './plantList'

const SAVE_DEBOUNCE_MS = 400

/**
 * Single source of truth for the plant list across all selector surfaces.
 * Mirrors useSiteProfile.ts exactly:
 *   - SSR-safe: first render is an empty list; localStorage hydrates after mount.
 *   - `hydrated` flips true once the client-side load completes.
 *   - Writes are debounced to avoid thrashing on rapid status changes.
 *   - If localStorage is unavailable the list lives in memory for the session.
 */
export function usePlantList() {
  const [list, setList] = useState<PlantList>(emptyList)
  const [hydrated, setHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // One-time hydration — must happen after mount so server and client's first
  // renders agree (both start with an empty list).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setList(loadList())
    setHydrated(true)
  }, [])

  // Debounced write-back whenever the list changes (after hydration).
  useEffect(() => {
    if (!hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveList(list), SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [list, hydrated])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const addPlant = useCallback(
    (plantSlug: string, status: PlantListStatus, zoneId?: string) => {
      setList((prev) => addOrUpdate(prev, plantSlug, status, zoneId))
    },
    [],
  )

  const removePlant = useCallback((plantSlug: string) => {
    setList((prev) => removeEntry(prev, plantSlug))
  }, [])

  const changeStatus = useCallback(
    (plantSlug: string, status: PlantListStatus) => {
      setList((prev) => setStatus(prev, plantSlug, status))
    },
    [],
  )

  const changeZone = useCallback(
    (plantSlug: string, zoneId: string | undefined) => {
      setList((prev) => setZone(prev, plantSlug, zoneId))
    },
    [],
  )

  const entryForPlant = useCallback(
    (plantSlug: string): PlantListEntry | undefined => entryFor(list, plantSlug),
    [list],
  )

  return {
    list,
    hydrated,
    addPlant,
    removePlant,
    changeStatus,
    changeZone,
    entryForPlant,
  }
}
