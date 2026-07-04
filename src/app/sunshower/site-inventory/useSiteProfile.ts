'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyProfile, loadProfile, saveProfile } from './profile'
import type { SiteProfile, StepId, StepStatus } from './types'

const SAVE_DEBOUNCE_MS = 400

/**
 * Single source of truth for the site profile across all wizard steps.
 * SSR-safe: first render is an empty profile, localStorage hydrates in an
 * effect after mount (`hydrated` flips true), writes are debounced.
 */
export function useSiteProfile() {
  const [profile, setProfile] = useState<SiteProfile>(emptyProfile)
  const [hydrated, setHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // One-time hydration from localStorage — must happen after mount so the
    // server render and the client's first render agree (both empty).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveProfile(profile), SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [profile, hydrated])

  const updateProfile = useCallback((patch: Partial<SiteProfile>) => {
    setProfile((p) => ({ ...p, ...patch }))
  }, [])

  const setStepStatus = useCallback((step: StepId, status: StepStatus) => {
    setProfile((p) => ({ ...p, steps: { ...p.steps, [step]: status } }))
  }, [])

  const resetProfile = useCallback(() => {
    const fresh = emptyProfile()
    setProfile(fresh)
    saveProfile(fresh)
  }, [])

  return { profile, hydrated, updateProfile, setStepStatus, resetProfile }
}
