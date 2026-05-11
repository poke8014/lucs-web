import plantsData from '../../../data/plants.json'
import type { Match, Plant } from './types'

const PLANTS = plantsData as Plant[]

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(ssp|subsp|var|f)\.?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type IndexEntry = { plant: Plant; key: string; original: string }

const INDEX: IndexEntry[] = PLANTS.flatMap((plant) => {
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

const FUZZY_LIMIT = 5

export function resolveName(input: string): Match[] {
  const q = normalize(input)
  if (!q) return []

  const exact: Match[] = []
  const partial: Match[] = []
  const fuzzy: { match: Match; distance: number }[] = []
  const seen = new Set<string>()

  for (const entry of INDEX) {
    if (entry.key === q) {
      if (!seen.has(entry.plant.slug)) {
        exact.push({ plant: entry.plant, confidence: 'exact', matchedOn: entry.original })
        seen.add(entry.plant.slug)
      }
    }
  }

  if (exact.length > 0) return exact

  for (const entry of INDEX) {
    if (seen.has(entry.plant.slug)) continue
    if (entry.key.includes(q) || q.includes(entry.key)) {
      partial.push({ plant: entry.plant, confidence: 'partial', matchedOn: entry.original })
      seen.add(entry.plant.slug)
    }
  }

  for (const entry of INDEX) {
    if (seen.has(entry.plant.slug)) continue
    const d = levenshtein(q, entry.key)
    if (d <= 2 && d < entry.key.length) {
      fuzzy.push({
        match: { plant: entry.plant, confidence: 'fuzzy', matchedOn: entry.original },
        distance: d,
      })
      seen.add(entry.plant.slug)
    }
  }

  fuzzy.sort((a, b) => a.distance - b.distance)

  return [...partial, ...fuzzy.map((f) => f.match)].slice(0, FUZZY_LIMIT)
}

export function plantBySlug(slug: string): Plant | undefined {
  return PLANTS.find((p) => p.slug === slug)
}

export function parseInputList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
