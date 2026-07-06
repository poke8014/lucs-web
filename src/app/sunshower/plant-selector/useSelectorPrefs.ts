'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  dismissSuggestions,
  emptyPrefs,
  isDismissed,
  loadPrefs,
  restoreSuggestions,
  savePrefs,
  type SelectorPrefs,
} from './selectorPrefs'

const SAVE_DEBOUNCE_MS = 400

/**
 * Dismissal memory for the native-swap nudge. SSR-safe, mirroring
 * useSiteProfile: first render is empty prefs, localStorage hydrates in an
 * effect after mount (`hydrated` flips true), writes debounce. When
 * localStorage is unavailable the prefs simply live in memory for the session.
 *
 * `dismissed(slug)` is intentionally boolean — the hook never surfaces a count.
 */
export function useSelectorPrefs() {
  const [prefs, setPrefs] = useState<SelectorPrefs>(emptyPrefs)
  const [hydrated, setHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // One-time hydration after mount so server + first client render agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => savePrefs(prefs), SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [prefs, hydrated])

  const dismiss = useCallback((plantSlug: string) => {
    setPrefs((p) => dismissSuggestions(p, plantSlug))
  }, [])

  const restore = useCallback((plantSlug: string) => {
    setPrefs((p) => restoreSuggestions(p, plantSlug))
  }, [])

  const dismissed = useCallback(
    (plantSlug: string) => isDismissed(prefs, plantSlug),
    [prefs],
  )

  return { prefs, hydrated, dismiss, restore, dismissed }
}
