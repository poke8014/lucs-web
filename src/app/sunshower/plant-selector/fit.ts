// Fit read: plant ↔ your site. The build-time sun-tier ↔ sun_range matrix,
// plus the other profile signals folded in. Pure + unit-tested against the
// real corpus. Reasons are human sentences, never scores.
//
// Sun matrix (planning/sunshower_plant_selector_spec.md §"Sun tier ↔ sun_range
// compatibility"), mapped onto observed Calscape tokens:
//   Full Sun ↔ full_sun · Partial Shade ↔ part-shade · Deep Shade ↔ full-shade
//
// | Zone tier                     | Compatible when range includes… |
// | full_sun                      | full_sun                        |
// | morning_sun_afternoon_shade   | partial_shade (gentle part-sun) |
// | morning_shade_afternoon_sun   | full_sun (+ heat flag; part-    |
// |                               |   shade-only demoted hard)      |
// | dappled_shade                 | partial_shade OR deep_shade     |
// | full_shade                    | deep_shade                      |

import type { SiteProfile, SunTier, SunZone } from '../site-inventory/types'
import { exceedsOverheadClearance, sunTokens } from './corpus'
import type { FitLevel, FitResult, SelectorPlant, SunToken } from './types'

// ── Sun-tier compatibility ────────────────────────────────────────────────

export type SunFit = 'good' | 'tolerable' | 'poor' | 'unknown'

// Does a zone tier get satisfied by this set of sun tokens?
function sunFit(tier: SunTier, tokens: SunToken[]): SunFit {
  if (tokens.length === 0) return 'unknown'
  const full = tokens.includes('full_sun')
  const part = tokens.includes('partial_shade')
  const deep = tokens.includes('deep_shade')

  switch (tier) {
    case 'full_sun':
      if (full) return 'good'
      // Part-shade-tolerant plants can scorch in full sun; deep-shade only is a
      // poor bet in blazing sun.
      return part && !deep ? 'tolerable' : 'poor'

    case 'morning_sun_afternoon_shade':
      // The gentlest part-sun. Part-shade plants thrive; full-sun ones are fine.
      if (part) return 'good'
      if (full) return 'tolerable'
      return 'poor'

    case 'morning_shade_afternoon_sun':
      // Harshest light. Needs full-sun tolerance. Part-shade-only demoted hard.
      if (full) return 'good'
      return 'poor'

    case 'dappled_shade':
      if (part || deep) return 'good'
      return 'poor' // full-sun-only plants stretch in dappled light

    case 'full_shade':
      if (deep) return 'good'
      if (part) return 'tolerable'
      return 'poor'
  }
}

// Human sentence for a sun read, given the tier context.
function sunReason(tier: SunTier, fit: SunFit): string {
  if (fit === 'unknown') {
    return "We don't have this plant's sun tolerance on file yet."
  }
  const heat = tier === 'morning_shade_afternoon_sun'
  switch (fit) {
    case 'good':
      return heat
        ? "Takes the harsh afternoon sun your spot gets."
        : "Its light needs match this spot."
    case 'tolerable':
      return heat
        ? "Should cope with your afternoon sun, though it'd prefer a break from it."
        : "Workable here, but not its ideal light."
    case 'poor':
      return heat
        ? "Wants a break from hot afternoon sun — this exposure will stress it."
        : "Its light needs and this spot pull in different directions."
  }
}

// ── Aspect modifier ───────────────────────────────────────────────────────
// S/SW/W aspects harden an afternoon-sun read: inland afternoon sun is the
// harshest light, so a part-shade-leaning plant in a hot-aspect afternoon-sun
// zone is a firmer "no".

const HOT_ASPECTS = new Set(['S', 'SW', 'W'])

function aspectHardensAfternoonSun(profile: SiteProfile): boolean {
  const c = profile.aspect?.cardinal
  return c != null && HOT_ASPECTS.has(c)
}

// ── Water / drainage signals ──────────────────────────────────────────────
// water_range prose: "Low" / "Very Low" / "Moderate" / "High" / combos.
// soil_drainage tokens: Fast / Medium / Slow / Standing.

function tokenizeWater(range: string | null): string[] {
  if (!range) return []
  return range
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function wantsSharpDrainage(plant: SelectorPlant): boolean {
  const d = plant.native?.soil_drainage ?? []
  // Fast-only (no Medium/Slow/Standing tolerance) = wants it to drain sharply.
  return d.includes('Fast') && !d.some((x) => x === 'Slow' || x === 'Standing')
}

function toleratesWetFeet(plant: SelectorPlant): boolean {
  const d = plant.native?.soil_drainage ?? []
  return d.includes('Slow') || d.includes('Standing')
}

function isDryLoving(plant: SelectorPlant): boolean {
  const w = tokenizeWater(plant.native?.water_range ?? null)
  // Low / Very Low / Extremely Low, with no High in the range.
  return (
    w.some((x) => x.includes('low')) && !w.some((x) => x.includes('high'))
  )
}

function isWetLoving(plant: SelectorPlant): boolean {
  const w = tokenizeWater(plant.native?.water_range ?? null)
  return w.includes('high')
}

// ── Soil pH soft check ────────────────────────────────────────────────────
// soil_ph prose like "5.0 - 8.0". phClue is acid/alkaline-leaning.

function parsePh(raw: string | null): { min: number; max: number } | null {
  if (!raw) return null
  const nums = (raw.match(/\d+(?:\.\d+)?/g) ?? [])
    .map(Number)
    .filter((n) => Number.isFinite(n))
  if (nums.length === 0) return null
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

// ── The fit read ──────────────────────────────────────────────────────────

const RANK: Record<Exclude<FitLevel, 'unknown'>, number> = {
  great: 3,
  good: 2,
  stretch: 1,
  mismatch: 0,
}
const NAMES: FitLevel[] = ['mismatch', 'stretch', 'good', 'great']

function demote(level: FitLevel, steps = 1): FitLevel {
  if (level === 'unknown') return 'unknown'
  const idx = Math.max(0, RANK[level] - steps)
  return NAMES[idx]
}

function findZone(
  profile: SiteProfile,
  zoneId: string | undefined,
): SunZone | undefined {
  if (zoneId) return profile.sunZones.find((z) => z.id === zoneId)
  return profile.sunZones[0]
}

// fitForZone(plant, zoneId, profile) → { level, reasons }.
// No profile → 'unknown' with an invitation. Non-native/unscored plants also
// return 'unknown' (the ladder scores fit for natives; tiering is Unit B/C).
export function fitForZone(
  plant: SelectorPlant,
  zoneId: string | undefined,
  profile: SiteProfile | null | undefined,
): FitResult {
  if (!profile) {
    return {
      level: 'unknown',
      reasons: [
        'Do the quick yard walkthrough and we can tell you how this plant would fit your space.',
      ],
    }
  }

  const reasons: string[] = []
  const native = plant.native

  // Overhead-line hard flag applies regardless of native data (uses height).
  if (
    profile.utilities?.overheadLines &&
    exceedsOverheadClearance(plant)
  ) {
    reasons.push(
      'Matures over 25 ft — keep it clear of the overhead power lines.',
    )
  }

  if (!native) {
    // No native block → no ecological fit read. Tier-aware voice: firm-kind
    // for invasives (the ladder says "not scored"), warm for everything else
    // (a 🟡 good-neighbor or unknown plant the user may already love).
    const reason =
      plant.nativity === 'invasive'
        ? "We don't score garden fit for invasives — if it's in your yard, the cleanup planner is the better tool for it."
        : "We score fit for the natives in our book — for this one, how it's already doing in your yard is the best read."
    return {
      level: 'unknown',
      reasons: [...reasons, reason],
    }
  }

  const zone = findZone(profile, zoneId)
  let level: FitLevel = 'good'

  // Sun — the primary lens.
  if (zone) {
    const tokens = sunTokens(native.sun_range)
    let fit = sunFit(zone.tier, tokens)

    // Aspect hardens the afternoon-sun tiers.
    if (
      zone.tier === 'morning_shade_afternoon_sun' &&
      aspectHardensAfternoonSun(profile) &&
      fit === 'tolerable'
    ) {
      fit = 'poor'
      reasons.push(
        "Your hot-facing aspect makes that afternoon sun even fiercer.",
      )
    }

    reasons.push(sunReason(zone.tier, fit))
    if (fit === 'good') level = 'great'
    else if (fit === 'tolerable') level = 'good'
    else if (fit === 'poor') level = 'mismatch'
    else level = 'unknown' // no sun data → can't lead with sun
  } else {
    level = 'good'
    reasons.push('Pick a spot to see how its light needs line up with yours.')
  }

  // Start from the sun read; the signals below can only demote or add reasons.
  if (level === 'unknown') {
    // Sun unknown but we may still have water/drainage/pH to say something.
    level = 'good'
  }

  // Water / drainage.
  const drainage = profile.soil?.drainage
  const pooling = Boolean(profile.waterSlope?.poolingSpots?.trim())

  if (drainage === 'slow' || pooling) {
    if (wantsSharpDrainage(plant)) {
      level = demote(level, 2)
      reasons.push('Wants sharp drainage — your wet, slow-draining spot will fight it.')
    } else if (toleratesWetFeet(plant) || isWetLoving(plant)) {
      reasons.push('Happy with damp feet — a good match for your wet corner.')
    }
  }

  if (drainage === 'fast') {
    if (isDryLoving(plant) || wantsSharpDrainage(plant)) {
      reasons.push('Likes it lean and fast-draining — right at home in your soil.')
      if (level === 'good') level = 'great'
    } else if (isWetLoving(plant)) {
      level = demote(level)
      reasons.push('Wants steady moisture — your fast-draining soil will dry it out.')
    }
  }

  // Soil pH — soft, demotes out-of-range with a stated reason.
  const clue = profile.soil?.phClue
  if (clue === 'acid_indicators' || clue === 'alkaline_indicators') {
    const ph = parsePh(native.soil_ph)
    if (ph) {
      if (clue === 'acid_indicators' && ph.min > 6.5) {
        level = demote(level)
        reasons.push('Prefers neutral-to-alkaline soil — your acidic ground is a mismatch.')
      } else if (clue === 'alkaline_indicators' && ph.max < 7) {
        level = demote(level)
        reasons.push('Prefers acidic soil — your alkaline-leaning ground is a mismatch.')
      }
    }
  }

  return { level, reasons }
}
