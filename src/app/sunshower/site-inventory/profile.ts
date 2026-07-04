import type { Cardinal, SiteProfile, StepId, StepStatus } from './types'

export const STORAGE_KEY = 'sunshower.siteProfile.v1'

export const STEP_IDS: StepId[] = [
  'archetype',
  'aspect',
  'sun_map',
  'wind',
  'water_slope',
  'utilities',
  'sightlines',
  'soil',
]

export function emptyProfile(): SiteProfile {
  const steps = {} as Record<StepId, StepStatus>
  for (const id of STEP_IDS) steps[id] = 'todo'
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    steps,
    sunZones: [],
    sightlines: [],
  }
}

export function loadProfile(): SiteProfile {
  if (typeof window === 'undefined') return emptyProfile()
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return emptyProfile()
  }
  if (!raw) return emptyProfile()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isProfileShaped(parsed)) return emptyProfile()
    // version gates future migrations; unknown versions fall back to empty
    if (parsed.version !== 1) return emptyProfile()
    return { ...emptyProfile(), ...parsed, steps: { ...emptyProfile().steps, ...parsed.steps } }
  } catch {
    return emptyProfile()
  }
}

export function saveProfile(profile: SiteProfile): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }),
    )
  } catch {
    // quota exceeded / private-mode restrictions — profile lives in memory for the session
  }
}

function isProfileShaped(value: unknown): value is SiteProfile {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.version === 'number' &&
    typeof v.steps === 'object' &&
    v.steps !== null &&
    Array.isArray(v.sunZones) &&
    Array.isArray(v.sightlines)
  )
}

const CARDINALS: Cardinal[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/** Compass bearing (degrees) → nearest 8-wind cardinal. 0/360 → N, 45 → NE, … */
export function bearingToCardinal(bearingDeg: number): Cardinal | null {
  if (!Number.isFinite(bearingDeg)) return null
  const normalized = ((bearingDeg % 360) + 360) % 360
  return CARDINALS[Math.round(normalized / 45) % 8]
}

export function completedStepCount(profile: SiteProfile): number {
  return STEP_IDS.filter((id) => profile.steps[id] === 'done').length
}

/** Resume target: first step still open — skipped steps don't pull the user back. */
export function firstUnfinishedStep(profile: SiteProfile): StepId | null {
  return (
    STEP_IDS.find(
      (id) => profile.steps[id] !== 'done' && profile.steps[id] !== 'skipped',
    ) ?? null
  )
}

export function hasAnyProgress(profile: SiteProfile): boolean {
  return STEP_IDS.some((id) => profile.steps[id] !== 'todo')
}
