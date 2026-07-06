// Plant list — persistence module.
// localStorage key 'sunshower.plantList.v1'; same load/save/fallback discipline
// as site-inventory/profile.ts. Shaped for the future `section_plants` rows.
//
// PlantList/PlantListEntry types live HERE (not types.ts — Unit D owns them).
//
// All exported helpers are pure functions so they're easy to unit-test.

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlantListStatus = 'considering' | 'chosen' | 'already_have'

export interface PlantListEntry {
  id: string          // crypto.randomUUID()
  plantSlug: string
  status: PlantListStatus
  zoneId?: string     // SiteProfile.sunZones[].id — where it's destined / lives
  notes?: string
}

export interface PlantList {
  version: 1
  updatedAt: string   // ISO
  entries: PlantListEntry[]
}

// ── Storage ───────────────────────────────────────────────────────────────────

export const PLANT_LIST_KEY = 'sunshower.plantList.v1'

export function emptyList(): PlantList {
  return { version: 1, updatedAt: new Date().toISOString(), entries: [] }
}

export function loadList(): PlantList {
  if (typeof window === 'undefined') return emptyList()
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(PLANT_LIST_KEY)
  } catch {
    return emptyList()
  }
  if (!raw) return emptyList()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isListShaped(parsed)) return emptyList()
    if (parsed.version !== 1) return emptyList()
    return { ...emptyList(), ...parsed }
  } catch {
    return emptyList()
  }
}

export function saveList(list: PlantList): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      PLANT_LIST_KEY,
      JSON.stringify({ ...list, updatedAt: new Date().toISOString() }),
    )
  } catch {
    // quota exceeded / private-mode restrictions — list lives in memory
  }
}

function isListShaped(value: unknown): value is PlantList {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.version === 'number' && Array.isArray(v.entries)
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Find the entry for a given plant slug, or undefined if absent. */
export function entryFor(
  list: PlantList,
  plantSlug: string,
): PlantListEntry | undefined {
  return list.entries.find((e) => e.plantSlug === plantSlug)
}

/** Add a plant with the given status. If already present, update its status. */
export function addOrUpdate(
  list: PlantList,
  plantSlug: string,
  status: PlantListStatus,
  zoneId?: string,
): PlantList {
  const existing = entryFor(list, plantSlug)
  if (existing) {
    return updateEntry(list, existing.id, { status, zoneId })
  }
  const entry: PlantListEntry = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    plantSlug,
    status,
    ...(zoneId ? { zoneId } : {}),
  }
  return { ...list, entries: [...list.entries, entry] }
}

/** Remove a plant from the list by slug. */
export function removeEntry(list: PlantList, plantSlug: string): PlantList {
  return { ...list, entries: list.entries.filter((e) => e.plantSlug !== plantSlug) }
}

/** Patch any fields on an existing entry by its id. */
export function updateEntry(
  list: PlantList,
  entryId: string,
  patch: Partial<Pick<PlantListEntry, 'status' | 'zoneId' | 'notes'>>,
): PlantList {
  return {
    ...list,
    entries: list.entries.map((e) =>
      e.id === entryId ? { ...e, ...patch } : e,
    ),
  }
}

/** Change just the status of a plant by slug. No-op if not in list. */
export function setStatus(
  list: PlantList,
  plantSlug: string,
  status: PlantListStatus,
): PlantList {
  const entry = entryFor(list, plantSlug)
  if (!entry) return list
  return updateEntry(list, entry.id, { status })
}

/** Change just the destination zone of a plant by slug. No-op if not in list. */
export function setZone(
  list: PlantList,
  plantSlug: string,
  zoneId: string | undefined,
): PlantList {
  const entry = entryFor(list, plantSlug)
  if (!entry) return list
  return updateEntry(list, entry.id, { zoneId })
}

/** Entries grouped by zone — undefined zoneId entries go under the null key. */
export function entriesByZone(
  list: PlantList,
): Map<string | null, PlantListEntry[]> {
  const map = new Map<string | null, PlantListEntry[]>()
  for (const entry of list.entries) {
    const key = entry.zoneId ?? null
    const group = map.get(key) ?? []
    group.push(entry)
    map.set(key, group)
  }
  return map
}
