// Contribution card: plant ↔ your eco-region. What the plant gives back,
// framed additively — never guilt math. See spec §2 (the two cards) and the
// nudge-ladder table (per-tier voice). Pure function → ready-to-render lines +
// structured fields the UI can style.
//
// The review question for every string here (spec §"The selection philosophy"):
// "would this make someone feel bad about a plant they love?" Only the 🔴 tier
// speaks of cost, and even there the tone is firm-but-kind with a warm handoff.

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

// snake_case corpus token → readable phrase. Unmapped tokens fall through to a
// plain de-underscored form so new vocabulary never renders as a raw slug.
function humanizeToken(token: string): string {
  return token.replace(/[-_]+/g, ' ').trim()
}

// Spread-mechanism tokens, phrased as what makes the plant hard to contain.
// Only the ones that read cleanly are given bespoke copy; the rest humanize.
const SPREAD_PHRASES: Record<string, string> = {
  long_lived_seedbank: 'a long-lived seed bank',
  extended_seeding: 'a long seeding window',
  abundant_seed: 'abundant seed',
  seeds_annually: 'seed every year',
  rapid_maturity: 'fast maturity',
  resprouts: 'resprouting after cutting',
  vegetative_structures: 'spreading roots and runners',
  fragments: 'rooting from broken fragments',
  stolons: 'creeping stolons',
  wind_dispersed: 'wind-carried seed',
  water_dispersed: 'water-carried seed',
  livestock_dispersed: 'seed carried by animals',
  vehicles_equipment: 'seed carried on vehicles and gear',
  self_and_cross_pollinated: 'easy pollination',
}

function costSpreadPhrases(plant: SelectorPlant): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of plant.spread_mechanisms ?? []) {
    const phrase = SPREAD_PHRASES[m] ?? humanizeToken(m)
    if (!seen.has(phrase)) {
      seen.add(phrase)
      out.push(phrase)
    }
  }
  return out
}

function costHabitatPhrases(plant: SelectorPlant): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const h of plant.habitat_types ?? []) {
    const phrase = humanizeToken(h)
    if (!seen.has(phrase)) {
      seen.add(phrase)
      out.push(phrase)
    }
  }
  return out
}

// Join a short list into an English phrase: "a, b, and c".
function joinPhrases(items: string[], limit = 3): string {
  const shown = items.slice(0, limit)
  if (shown.length === 0) return ''
  if (shown.length === 1) return shown[0]
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`
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
    // 🔴 variant — what it costs the region. Firm, kind, concrete: name the
    // real mechanism and the wild places it displaces, then hand off warmly to
    // the cleanup planner. No urgency theatrics; the cost speaks for itself.
    const spread = costSpreadPhrases(plant)
    const habitats = costHabitatPhrases(plant)

    lines.push('This one escapes gardens and crowds out natives in the wild here.')
    if (spread.length > 0) {
      lines.push(`Hard to hold back — it spreads by ${joinPhrases(spread)}.`)
    }
    if (habitats.length > 0) {
      lines.push(`It's already displacing native plants in ${joinPhrases(habitats)}.`)
    }

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
      costSpread: spread,
      costHabitats: habitats,
      calIpcRating: plant.cal_ipc_rating,
      offersCleanupHandoff: true,
    }
  }

  if (t === 'unknown') {
    lines.push("This one isn't in our book yet, so we can't tell you what it gives the local food web.")
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
      costSpread: [],
      costHabitats: [],
      calIpcRating: null,
      offersCleanupHandoff: false,
    }
  }

  if (t === 'non_native_safe') {
    // 🟡 variant — honest asymmetry, kindly put. Real joy, real nectar; the one
    // thing it usually can't do is host native caterpillars (that's leaf
    // chemistry, native-only). The `benign:` data block doesn't exist yet
    // (unit E), so we render from what's in the corpus and degrade gracefully:
    // whatever pollinator/wildlife data we have becomes the "what it gives"
    // line, and the asymmetry note is stated plainly without shaming.
    if (wildlife.length > 0) {
      lines.push(`Its flowers feed ${joinPhrases(wildlife.map((w) => w.toLowerCase()), 4)} — real nectar, real value.`)
    } else {
      lines.push('A well-loved garden plant that brings real joy to grow.')
    }
    lines.push(
      "Native caterpillars usually can't feed on its leaves, though — that's the one thing a native neighbor could add.",
    )
    if (bloomSeason.length > 0) {
      const seasons = bloomSeason.join(', ')
      lines.push(
        leanSeasonForager
          ? `Blooms ${seasons} — a lean season for foragers.`
          : `Blooms ${seasons}.`,
      )
    }
    if (nurseryAvailability) {
      lines.push(`Nursery availability: ${nurseryAvailability.toLowerCase()}.`)
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
      costSpread: [],
      costHabitats: [],
      calIpcRating: null,
      offersCleanupHandoff: false,
    }
  }

  // native (🟢) — the star of the show.
  lines.push('Verified growing wild within ~10 miles of San Jose.')

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
    costSpread: [],
    costHabitats: [],
    calIpcRating: null,
    offersCleanupHandoff: false,
  }
}
