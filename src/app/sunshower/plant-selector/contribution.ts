// Contribution card: plant ↔ your eco-region. What the plant gives back,
// framed additively — never guilt math. See spec §2 (the two cards).
// Pure function → ready-to-render lines + structured fields the UI can style.

import type { ContributionCard, SelectorPlant } from './types'

// Fall/winter bloomers cover the lean forage season.
const LEAN_SEASONS = new Set(['fall', 'winter'])

function tier(plant: SelectorPlant): ContributionCard['tier'] {
  if (plant.nativity === 'native' && plant.native) return 'native'
  if (plant.nativity === 'non_native_safe') return 'non_native_safe'
  if (plant.nativity === 'invasive') return 'invasive'
  return 'unknown'
}

// attracts_wildlife ∪ pollinators, de-duplicated and title-cased-ish.
function wildlifeList(plant: SelectorPlant): string[] {
  const set = new Set<string>()
  for (const w of plant.native?.attracts_wildlife ?? []) set.add(w)
  for (const p of plant.pollinators ?? []) {
    // pollinators are lowercase ('bees'); attracts_wildlife are 'Bees'.
    const cap = p.charAt(0).toUpperCase() + p.slice(1)
    if (!set.has(cap)) set.add(cap)
  }
  return [...set]
}

export function contribution(plant: SelectorPlant): ContributionCard {
  const t = tier(plant)
  const native = plant.native
  const hostCount = native?.butterflies_moths_supported ?? null
  const wildlife = wildlifeList(plant)
  const communities = native?.communities_simplified ?? []
  const bloomSeason = plant.bloom_season ?? []
  const leanSeasonForager = bloomSeason.some((s) => LEAN_SEASONS.has(s))
  const nurseryAvailability = native?.nursery_availability ?? null
  const isCultivar = native?.is_cultivar ?? false

  const lines: string[] = []

  if (t === 'invasive') {
    // 🔴 variant — cost, not contribution. Fuller copy is Unit C; here we hand
    // the card the honest frame + the cleanup handoff hook.
    lines.push('Invasive here — it spreads into wild places and crowds out natives.')
    lines.push('See the cleanup plan for how to remove it and what to plant instead.')
    return {
      tier: t,
      hostCount: null,
      wildlife: [],
      communities: [],
      bloomSeason,
      leanSeasonForager: false,
      nurseryAvailability: null,
      isCultivar: false,
      lines,
    }
  }

  if (t === 'unknown') {
    lines.push("Not in our book yet — we can't tell you what it gives the local food web.")
    lines.push('If it’s thriving and you love it, that counts for a lot.')
    return {
      tier: t,
      hostCount: null,
      wildlife: [],
      communities: [],
      bloomSeason,
      leanSeasonForager,
      nurseryAvailability: null,
      isCultivar: false,
      lines,
    }
  }

  // native (🟢) — the star. non_native_safe (🟡) shares the additive frame but
  // the honest-asymmetry copy (leaves can't host natives) is Unit C / Unit E.
  if (t === 'native') {
    lines.push('Verified growing wild within ~10 miles of San Jose.')
  }

  if (hostCount != null && hostCount > 0) {
    lines.push(
      `Hosts ${hostCount} butterfly & moth species — the nursery non-natives almost never provide.`,
    )
  }

  if (wildlife.length > 0) {
    lines.push(`Feeds & shelters: ${wildlife.join(', ').toLowerCase()}.`)
  }

  if (communities.length > 0) {
    lines.push(`A member of the ${communities.join(', ')} community.`)
  }

  if (bloomSeason.length > 0) {
    const seasons = bloomSeason.join(', ')
    if (leanSeasonForager) {
      lines.push(`Blooms ${seasons} — a lean season for foragers.`)
    } else {
      lines.push(`Blooms ${seasons}.`)
    }
  }

  if (nurseryAvailability) {
    lines.push(`Nursery availability: ${nurseryAvailability.toLowerCase()}.`)
  }

  if (isCultivar) {
    lines.push('This is a cultivar — often less useful to pollinators than the wild species.')
  }

  return {
    tier: t,
    hostCount,
    wildlife,
    communities,
    bloomSeason,
    leanSeasonForager,
    nurseryAvailability,
    isCultivar,
    lines,
  }
}
