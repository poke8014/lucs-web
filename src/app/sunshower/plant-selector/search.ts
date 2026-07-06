// Full-corpus search for the selector — mirrors cleanup-plan/resolver.ts but
// returns SelectorPlant so the drawer can read the `native:` block. Matches over
// scientific_name / common_names / aliases; accepts anything by design (natives,
// invasives, whatever the user is curious about). Pure, no React.

import { allPlants } from './corpus'
import type { SelectorPlant } from './types'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(ssp|subsp|var|f)\.?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface IndexEntry {
  plant: SelectorPlant
  key: string
  original: string
}

const INDEX: IndexEntry[] = allPlants().flatMap((plant) => {
  const names = [plant.scientific_name, ...plant.common_names, ...plant.aliases]
  return names
    .filter(Boolean)
    .map((n) => ({ plant, key: normalize(n), original: n }))
    .filter((e) => e.key.length > 0)
})

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost)
      prevDiag = tmp
    }
  }
  return prev[b.length]
}

export interface SelectorSearchResult {
  plant: SelectorPlant
  matchedOn: string
}

type SearchHit = SelectorSearchResult & { rank: number; distance: number }

export function searchCorpus(query: string, limit = 12): SelectorSearchResult[] {
  const q = normalize(query)
  if (!q) return []

  const hits = new Map<string, SearchHit>()

  for (const entry of INDEX) {
    let rank: number
    let distance = 0
    if (entry.key === q) {
      rank = 0
    } else if (entry.key.startsWith(q)) {
      rank = 1
    } else if (entry.key.includes(q)) {
      rank = 2
    } else if (q.length >= 4) {
      const d = levenshtein(q, entry.key)
      if (d <= 2 && d < entry.key.length) {
        rank = 3
        distance = d
      } else {
        continue
      }
    } else {
      continue
    }
    const existing = hits.get(entry.plant.slug)
    if (
      !existing ||
      rank < existing.rank ||
      (rank === existing.rank && distance < existing.distance)
    ) {
      hits.set(entry.plant.slug, {
        plant: entry.plant,
        matchedOn: entry.original,
        rank,
        distance,
      })
    }
  }

  return [...hits.values()]
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.distance - b.distance ||
        a.plant.scientific_name.localeCompare(b.plant.scientific_name),
    )
    .slice(0, limit)
    .map(({ plant, matchedOn }) => ({ plant, matchedOn }))
}
