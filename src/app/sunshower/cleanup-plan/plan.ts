import type { CalIpcRating, Plant, RemovalMethod, SafetyFlag } from './types'

const RATING_RANK: Record<CalIpcRating, number> = {
  high: 0,
  moderate: 1,
  limited: 2,
  watch: 3,
  alert: 4,
}

// Display labels from vault/synthesis/invasive-removal-methods.md.
// Keep in sync with the RemovalMethod union in ./types.
const METHOD_LABEL: Record<RemovalMethod, string> = {
  hand_pull: 'Hand-pull young plants before seed set',
  dig_taproot: 'Dig out the entire taproot and crown',
  cut_stump_herbicide: 'Cut at base and paint stump with herbicide',
  cane_cut_dig_crown: 'Cut canes, then dig out root crowns',
  pull_vine_dig_crown: 'Sever vines and excavate rooted crowns',
  dig_rhizome_complete: 'Excavate the entire rhizome — bag fragments',
  dig_bulb_complete: 'Dig the entire bulb chain — sift soil',
  sheet_mulch_smother: 'Smother under heavy cardboard and mulch',
  mow_before_seed: 'Mow repeatedly just before seed set',
  solarize_summer: 'Solarize under clear plastic in summer',
  prune_host_below_attachment: "Prune host plant below the parasite's attachment point",
}

const UNDOCUMENTED_LABEL = 'Method not yet documented for these plants'

// Fallback caution strings for plants that don't yet have a `removal_method`
// assigned (99 of 137 as of the Agent B rollout). Derived from spread
// mechanisms so the user still gets something concrete to act on.
const HUMAN_VECTOR_MARKERS = new Set([
  'mowing',
  'dumping',
  'vehicles_equipment',
  'intentional-planting',
  'intentional_planting',
])

function fallbackNotes(plant: Plant): string[] {
  const out: string[] = []
  const mechs = plant.spread_mechanisms
  if (mechs.includes('rhizomes')) {
    out.push('Spreads by rhizomes — every fragment can re-root.')
  }
  if (mechs.includes('stolons')) {
    out.push('Spreads by stolons — trace each runner before cutting.')
  }
  if (mechs.includes('resprouts')) {
    out.push('Resprouts after cutting — flag for repeat visits.')
  }
  if (mechs.includes('long_lived_seedbank')) {
    out.push('Long-lived seedbank — plan multi-year follow-up.')
  }
  if (mechs.some((m) => HUMAN_VECTOR_MARKERS.has(m))) {
    out.push('Spread by mowing/dumping/vehicles — bag and dispose, do not green-bin.')
  }
  return out
}

export type PlanPlant = {
  plant: Plant
  notes: string[]
}

export type MethodGroup = {
  method: RemovalMethod | null
  methodLabel: string
  plants: PlanPlant[]
}

function ratingScore(plant: Plant): number {
  return plant.cal_ipc_rating ? RATING_RANK[plant.cal_ipc_rating] : 99
}

function worstRating(plants: Plant[]): number {
  return plants.reduce((min, p) => Math.min(min, ratingScore(p)), 99)
}

export function buildPlan(plants: Plant[]): MethodGroup[] {
  // Bucket plants by removal_method (null lands in a single 'undocumented' bucket).
  const buckets = new Map<RemovalMethod | null, Plant[]>()
  for (const plant of plants) {
    const key = plant.removal_method
    const arr = buckets.get(key)
    if (arr) arr.push(plant)
    else buckets.set(key, [plant])
  }

  const groups: MethodGroup[] = []
  for (const [method, ps] of buckets) {
    const sortedPlants = [...ps].sort((a, b) => {
      const r = ratingScore(a) - ratingScore(b)
      if (r !== 0) return r
      return a.scientific_name.localeCompare(b.scientific_name)
    })
    groups.push({
      method,
      methodLabel: method ? METHOD_LABEL[method] : UNDOCUMENTED_LABEL,
      plants: sortedPlants.map((plant) => ({
        plant,
        notes:
          plant.removal_notes.length > 0
            ? plant.removal_notes
            : fallbackNotes(plant),
      })),
    })
  }

  // Order: worst rating first, then larger groups first, then by method key
  // for determinism. Null method (undocumented) always sinks to the bottom.
  groups.sort((a, b) => {
    if (a.method === null && b.method !== null) return 1
    if (b.method === null && a.method !== null) return -1
    const ra = worstRating(a.plants.map((x) => x.plant))
    const rb = worstRating(b.plants.map((x) => x.plant))
    if (ra !== rb) return ra - rb
    if (a.plants.length !== b.plants.length) return b.plants.length - a.plants.length
    return (a.method ?? '').localeCompare(b.method ?? '')
  })

  return groups
}

// ---------------------------------------------------------------------------
// Layer B — yard-wide summary above the per-plant cards.
// ---------------------------------------------------------------------------

// Tools required per removal method. Always paired with the universal "heavy
// contractor bags for disposal" line at the end of the rendered list.
const METHOD_TOOLS: Record<RemovalMethod, string[]> = {
  hand_pull: ['Sturdy gloves', 'Kneeling pad'],
  dig_taproot: ['Shovel or sharpshooter spade', 'Soak the soil first if dry'],
  cut_stump_herbicide: [
    'Loppers or hand saw (chainsaw for thick stems)',
    'Concentrated triclopyr or glyphosate',
    'Small disposable brush for stump painting',
    'Heavy gloves + eye protection',
  ],
  cane_cut_dig_crown: ['Loppers', 'Mattock or pick', 'Leather sleeves and gloves'],
  pull_vine_dig_crown: ['Loppers / pruners', 'Hand spade for crowns'],
  dig_rhizome_complete: ['Shovel + mattock', 'Tarp for fragments', 'Soil sieve for heavy infestations'],
  dig_bulb_complete: ['Hand fork', 'Hardware-cloth sieve'],
  sheet_mulch_smother: ['Heavy cardboard (no glossy print)', '4–6 inches of wood-chip mulch'],
  mow_before_seed: ['Mower or string trimmer', 'Eye protection (awns)'],
  solarize_summer: ['Clear plastic sheeting (4–6 mil)', 'Stakes or weights to seal edges'],
  prune_host_below_attachment: [
    'Bypass pruners',
    'Gloves',
    'Sealed bag for disposal (do not compost)',
  ],
}

// SafetyFlag → human-readable yard-wide caution. Most flags expand only when
// triggered by the user's selections. Some (fragment_spreader) escalate when
// 2+ plants share the flag; see buildSummary for that logic.
const FLAG_CAUTION: Record<SafetyFlag, string> = {
  fragment_spreader:
    'Bag everything for landfill — fragments re-root from cuttings, runners, or root pieces. Do not green-bin or compost.',
  spines_thorns:
    'Wear thick gloves and eye protection — spines/awns puncture standard gardening gloves.',
  irritant_sap:
    'Skin-irritant sap — long sleeves, gloves, and avoid touching your face while working.',
  toxic_handling:
    'Toxic plant material — wear gloves, long sleeves, and a respirator on dry days. Wash tools and clothes after the session.',
  do_not_burn:
    "Don't burn debris — releases toxic smoke (poison-hemlock) or stimulates seedbank germination (brooms, gorse).",
  do_not_mow:
    "Don't mow or weed-whack — fragments fly and re-root, or seed/dust gets airborne.",
  allergenic_pollen:
    'Allergenic pollen or dust — work upwind, consider a dust mask on dry days.',
}

export type SummaryPlant = {
  slug: string
  scientific_name: string
  common_name: string | null
}

export type TimingGroup = {
  window: string
  plants: SummaryPlant[]
}

export type FollowupGroup = {
  years: number
  plants: SummaryPlant[]
}

export type CleanupSummary = {
  tools: string[]
  timing: TimingGroup[]
  cautions: string[]
  followup: FollowupGroup[]
}

function summaryPlant(plant: Plant): SummaryPlant {
  return {
    slug: plant.slug,
    scientific_name: plant.scientific_name,
    common_name: plant.common_names[0] ?? null,
  }
}

export function buildSummary(plants: Plant[]): CleanupSummary {
  // Tools — union of per-method tool lists, plus the universal disposal line.
  const methodsUsed = new Set<RemovalMethod>()
  for (const p of plants) {
    if (p.removal_method) methodsUsed.add(p.removal_method)
  }
  const toolSet: string[] = []
  const seenTool = new Set<string>()
  for (const m of methodsUsed) {
    for (const t of METHOD_TOOLS[m]) {
      if (!seenTool.has(t)) {
        seenTool.add(t)
        toolSet.push(t)
      }
    }
  }
  if (toolSet.length > 0) {
    toolSet.push('Heavy contractor bags for landfill (do not green-bin invasive material)')
  }

  // Timing — bucket plants by their removal_timing_window string.
  const timingBuckets = new Map<string, Plant[]>()
  for (const p of plants) {
    const w = p.removal_timing_window
    if (!w) continue
    const arr = timingBuckets.get(w)
    if (arr) arr.push(p)
    else timingBuckets.set(w, [p])
  }
  const timing: TimingGroup[] = [...timingBuckets].map(([window, ps]) => ({
    window,
    plants: ps
      .slice()
      .sort((a, b) => a.scientific_name.localeCompare(b.scientific_name))
      .map(summaryPlant),
  }))
  // Sort timing groups roughly by season — extract earliest month name from
  // the window string. "Any cool month" / undated buckets sink to the bottom.
  timing.sort((a, b) => seasonRank(a.window) - seasonRank(b.window))

  // Cautions — aggregate safety_flags across selections. Most flags fire when
  // any selected plant carries them; fragment_spreader escalates when 2+ do
  // (a single fragment-spreader is already covered in its per-plant notes;
  // multiple is the yard-wide rule worth surfacing).
  const flagCounts = new Map<SafetyFlag, number>()
  for (const p of plants) {
    for (const f of p.safety_flags) {
      flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1)
    }
  }
  const cautions: string[] = []
  const flagOrder: SafetyFlag[] = [
    'toxic_handling',
    'do_not_burn',
    'spines_thorns',
    'irritant_sap',
    'do_not_mow',
    'fragment_spreader',
    'allergenic_pollen',
  ]
  for (const flag of flagOrder) {
    const n = flagCounts.get(flag) ?? 0
    if (n === 0) continue
    if (flag === 'fragment_spreader' && n < 2) continue
    cautions.push(FLAG_CAUTION[flag])
  }

  // Multi-year follow-up — bucket plants by requires_followup_years. Surface
  // only horizons of 5+ years (anything shorter is implicit in the per-plant
  // notes and would clutter the summary). Sort buckets desc by years.
  const followupBuckets = new Map<number, Plant[]>()
  for (const p of plants) {
    const y = p.requires_followup_years
    if (!y || y < 5) continue
    const arr = followupBuckets.get(y)
    if (arr) arr.push(p)
    else followupBuckets.set(y, [p])
  }
  const followup: FollowupGroup[] = [...followupBuckets]
    .sort((a, b) => b[0] - a[0])
    .map(([years, ps]) => ({
      years,
      plants: ps
        .slice()
        .sort((a, b) => a.scientific_name.localeCompare(b.scientific_name))
        .map(summaryPlant),
    }))

  return { tools: toolSet, timing, cautions, followup }
}

// Map the leading month/season word in a timing-window string to a rank so
// we can sort buckets January → December. Anything we can't recognize (e.g.
// "Any cool month", "Any time…") goes to the end.
const MONTH_RANK: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  // Seasons map to the start of their window — used as a fallback when the
  // string leads with a season instead of a month.
  winter: 1,
  spring: 3,
  summer: 6,
  fall: 9,
  autumn: 9,
  // "Late summer" / "Late spring" etc. land here via the second-word fallback.
  late: 99,
  early: 99,
}

function seasonRank(window: string): number {
  const tokens = window.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  for (const t of tokens) {
    if (t in MONTH_RANK && MONTH_RANK[t] < 99) return MONTH_RANK[t]
  }
  return 100
}
