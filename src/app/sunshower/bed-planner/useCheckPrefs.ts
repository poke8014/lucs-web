'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  dismissFinding,
  dismissedKeysFor,
  emptyCheckPrefs,
  isFindingDismissed,
  loadCheckPrefs,
  restoreFinding,
  saveCheckPrefs,
  type CheckPrefs,
} from './checkPrefs'

const SAVE_DEBOUNCE_MS = 400

/**
 * Dismissal memory for the plan checker, scoped to one plan. SSR-safe, mirroring
 * useSelectorPrefs/useSiteProfile: first render is empty prefs, localStorage
 * hydrates in an effect after mount (`hydrated` flips true), writes debounce.
 * When localStorage is unavailable the prefs live in memory for the session.
 *
 * The returned `dismissedKeys` is the list of dismissed finding keys for *this*
 * plan — the shape CheckerPanel takes directly.
 */
export function useCheckPrefs(planId: string) {
  const [prefs, setPrefs] = useState<CheckPrefs>(emptyCheckPrefs)
  const [hydrated, setHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // One-time hydration after mount so server + first client render agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadCheckPrefs())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveCheckPrefs(prefs), SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [prefs, hydrated])

  const dismiss = useCallback(
    (findingKey: string) => setPrefs((p) => dismissFinding(p, planId, findingKey)),
    [planId],
  )

  const restore = useCallback(
    (findingKey: string) => setPrefs((p) => restoreFinding(p, planId, findingKey)),
    [planId],
  )

  const dismissed = useCallback(
    (findingKey: string) => isFindingDismissed(prefs, planId, findingKey),
    [prefs, planId],
  )

  const dismissedKeys = dismissedKeysFor(prefs, planId)

  return { prefs, hydrated, dismiss, restore, dismissed, dismissedKeys }
}
