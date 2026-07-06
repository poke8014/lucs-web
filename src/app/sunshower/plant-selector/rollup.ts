// Contribution rollup — pure logic for the "My plant list" surface.
//
// Rolls up what a set of plants collectively gives to the local ecosystem.
// Framed additively (what you'd be adding / already contributing), never as
// guilt math. "Your yard already feeds X; here's what would fill the fall gap."
//
// Tested in plant-list.test.ts against the real corpus.

import { nativePlants } from './corpus'
import type { PlantListEntry, PlantListStatus } from './plantList'
import type { SelectorPlant } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BloomGaps {
  covered: string[]   // seasons that have at least one blooming plant
  missing: string[]   // seasons with zero bloom (ordered spring/summer/fall/winter)
}

export interface ContributionRollup {
  /** Total unique butterfly & moth host species supported across chosen + already_have natives. */
  totalHostSpecies: number
  /** Wildlife guilds fed across the full set (union of attracts_wildlife + pollinators). */
  wildlifeGuilds: string[]
  /** Bloom seasons covered. */
  bloomCoverage: BloomGaps
  /** Number of plants with status 'already_have'. */
  alreadyHaveCount: number
  /** Whether the already_have plants alone provide any hosting. */
  alreadyHaveHosting: boolean
  /** Friendly one-liners for the UI — framed additively. */
  lines: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEASON_ORDER = ['spring', 'summer', 'fall', 'winter']

function bloomGaps(plants: SelectorPlant[]): BloomGaps {
  const covered = new Set<string>()
  for (const p of plants) {
    for (const s of p.bloom_season ?? []) {
      covered.add(s.toLowerCase())
    }
  }
  return {
    covered: SEASON_ORDER.filter((s) => covered.has(s)),
    missing: SEASON_ORDER.filter((s) => !covered.has(s)),
  }
}

function wildlifeUnion(plants: SelectorPlant[]): string[] {
  const set = new Set<string>()
  for (const p of plants) {
    for (const w of p.native?.attracts_wildlife ?? []) set.add(w)
    for (const pol of p.pollinators ?? []) {
      const cap = pol.charAt(0).toUpperCase() + pol.slice(1)
      set.add(cap)
    }
  }
  return [...set].sort()
}

function totalHostSpecies(plants: SelectorPlant[]): number {
  // Sum the host counts. Counts from different plants overlap (the same moth
  // uses several hosts), so the sum is an UPPER bound on unique species — the
  // rollup line says "up to N" until named species land via enrichment and we
  // can dedup for real.
  return plants.reduce((acc, p) => acc + (p.native?.butterflies_moths_supported ?? 0), 0)
}

// Build the human-readable rollup lines.
function buildLines(rollup: Omit<ContributionRollup, 'lines'>): string[] {
  const lines: string[] = []

  if (rollup.alreadyHaveCount === 0 && rollup.totalHostSpecies === 0) {
    // Empty or no natives yet — invitation frame.
    return lines
  }

  if (rollup.alreadyHaveHosting && rollup.alreadyHaveCount > 0) {
    lines.push(
      `Your yard is already hosting butterfly and moth species — the ones you've noted as keepers are earning their place.`,
    )
  }

  if (rollup.totalHostSpecies > 0) {
    lines.push(
      `Together, this palette supports up to ${rollup.totalHostSpecies} butterfly & moth species.`,
    )
  }

  if (rollup.wildlifeGuilds.length > 0) {
    lines.push(
      `Feeds & shelters: ${rollup.wildlifeGuilds.join(', ').toLowerCase()}.`,
    )
  }

  const { covered, missing } = rollup.bloomCoverage
  if (covered.length > 0) {
    if (missing.length === 0) {
      lines.push(`Bloom spans all four seasons — something for foragers year-round.`)
    } else if (missing.length > 0) {
      const missingStr = missing.join(' and ')
      lines.push(
        `Bloom covers ${covered.join(', ')}. ${missingStr.charAt(0).toUpperCase() + missingStr.slice(1)} ${missing.length === 1 ? 'is' : 'are'} quiet — a plant or two blooming then would fill the gap.`,
      )
    }
  }

  return lines
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Roll up the ecological contribution of a set of plant-list entries.
 *
 * @param entries - The current plant list entries (all statuses).
 * @param corpus  - The full plant corpus (from nativePlants() or allPlants()).
 *                  Defaults to nativePlants() if not provided.
 * @param rollupStatuses - Which statuses to include in the rollup.
 *                         Defaults to 'chosen' and 'already_have'.
 */
export function contributionRollup(
  entries: PlantListEntry[],
  corpus?: SelectorPlant[],
  rollupStatuses: PlantListStatus[] = ['chosen', 'already_have'],
): ContributionRollup {
  const plants = corpus ?? nativePlants()
  const slugMap = new Map(plants.map((p) => [p.slug, p]))

  const rollupEntries = entries.filter((e) => rollupStatuses.includes(e.status))
  const alreadyHaveEntries = entries.filter((e) => e.status === 'already_have')

  const rollupPlants = rollupEntries
    .map((e) => slugMap.get(e.plantSlug))
    .filter((p): p is SelectorPlant => p?.native != null)

  const alreadyHavePlants = alreadyHaveEntries
    .map((e) => slugMap.get(e.plantSlug))
    .filter((p): p is SelectorPlant => p?.native != null)

  const alreadyHaveHosting =
    alreadyHavePlants.some((p) => (p.native?.butterflies_moths_supported ?? 0) > 0)

  const partial: Omit<ContributionRollup, 'lines'> = {
    totalHostSpecies: totalHostSpecies(rollupPlants),
    wildlifeGuilds: wildlifeUnion(rollupPlants),
    bloomCoverage: bloomGaps(rollupPlants),
    alreadyHaveCount: alreadyHaveEntries.length,
    alreadyHaveHosting,
  }

  return { ...partial, lines: buildLines(partial) }
}
