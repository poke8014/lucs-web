// The 13 plan-checker rules as pure functions (spec §"The plan checker" table).
//
// Each rule takes a resolved CheckContext (plan + profile + a plant index) and
// returns zero or more Findings. Rules never mutate, never touch storage, never
// throw on missing data — absence yields no finding. Copy is invitation, not
// scold (spec §copy tone); no urgency language.
//
// Dismissal-key discipline: every key is (ruleId + the stable ids of the plan
// entities the finding is about). Same plan → same keys across recomputation, so
// a dismissal sticks (checkPrefs.ts). Keys never encode array index or a counter.

import type { GardenPlan, Placement, Section } from '../types'
import type { SelectorPlant } from '../../plant-selector/types'
import type { SiteProfile } from '../../site-inventory/types'
import { polygonBounds, pointInPolygon, polygonCentroid, distanceToPolygonEdge } from '../geometry'
import { sectionQuantities, layerShares } from '../placements'
import type { Finding } from './types'
import {
  SEASONS,
  type BloomSeason,
  plantIndex,
  placementSlugs,
  placementBloomSeasons,
  matureHeightFt,
  matureWidthFt,
  placementAnchorPoint,
  sunExcludes,
  waterExcludes,
  viewingEdge,
  depthFromEdge,
  pathSegments,
  pointToSegment,
} from './helpers'

// ── Context ───────────────────────────────────────────────────────────────────

export interface CheckContext {
  plan: GardenPlan
  profile: SiteProfile | null
  index: Map<string, SelectorPlant>
}

export function makeContext(
  plan: GardenPlan,
  profile: SiteProfile | null,
  corpus: SelectorPlant[],
): CheckContext {
  return { plan, profile, index: plantIndex(corpus) }
}

// A rule is a pure function CheckContext → Finding[].
export type Rule = (ctx: CheckContext) => Finding[]

// Human name for a plant slug, for friendly copy. Falls back to the slug.
function plantName(slug: string, index: Map<string, SelectorPlant>): string {
  const p = index.get(slug)
  if (!p) return slug
  return p.common_names[0] ?? p.scientific_name
}

function sectionName(section: Section): string {
  return section.name.trim() || 'this bed'
}

// ── Tuning constants (documented thresholds) ──────────────────────────────────

/** Rule 1: ground plane (groundcover+filler) should be roughly half the plants. */
const GROUND_PLANE_FLOOR = 0.35 // "≪ ~50%" — fire below 35%
/** Rule 3: only *big* inversions (front plant taller by >2× and >2 ft). */
const INVERSION_RATIO = 2
const INVERSION_MIN_FT = 2
/** Rule 4: a drift/individual of 1–2 for a non-structural plant reads lonely. */
const LONELY_MAX_COUNT = 2
/** Rule 7: landscaped crowding tolerance — foliage may come within ~1 ft. */
const CROWDING_CLEARANCE_FT = 1
/** Rule 8: foundation clearance ideal 2 ft, 1 ft minimum (trunk-to-wall). */
const FOUNDATION_MIN_CLEARANCE_FT = 1
/** Rule 10 / general: "tall" for sightline + screen reasoning. */
const TALL_FT = 4
/** Rule 12: a bed interior point more than this from any path/edge is a reach. */
const UNREACHABLE_FT = 5

// ── Rule 1 — bare-ground / green-mulch ────────────────────────────────────────

export const bareGround: Rule = ({ plan, index }) => {
  const findings: Finding[] = []
  const quantities = sectionQuantities(plan.sections, plan.placements, [...index.values()])

  for (const section of plan.sections) {
    const counts = quantities[section.id]
    if (!counts || counts.total === 0) continue // empty section — nothing to judge yet

    const shares = layerShares(counts.byLayer)
    const groundPlane =
      (shares.find((s) => s.role === 'groundcover')?.share ?? 0) +
      (shares.find((s) => s.role === 'filler')?.share ?? 0)

    const naturalistic = section.densityStyle === 'naturalistic'
    const hasMatrix = plan.placements.some(
      (p) => p.sectionId === section.id && p.kind === 'matrixFill',
    )

    // A naturalistic section with no matrix fill at all is the sharpest tell.
    const noMatrixInNaturalistic = naturalistic && !hasMatrix

    if (groundPlane < GROUND_PLANE_FLOOR || noMatrixInNaturalistic) {
      findings.push({
        key: `bare_ground:${section.id}`,
        ruleId: 'bare_ground',
        severity: 'suggestion',
        sectionId: section.id,
        message: noMatrixInNaturalistic
          ? `${sectionName(section)} is naturalistic but has no ground-covering mix yet — want to knit the soil closed?`
          : `${sectionName(section)} leaves a lot of open soil — a low ground layer keeps weeds out and holds moisture.`,
        why: 'Aim for a ground plane around half the plants; bare soil is the most common way a native bed slips back into weeds.',
        anchor: 'planting-layers',
      })
    }
  }
  return findings
}

// ── Rule 2 — bloom-succession gap ─────────────────────────────────────────────

export const bloomGap: Rule = ({ plan, index }) => {
  if (plan.placements.length === 0) return []
  const covered = new Set<BloomSeason>()
  for (const placement of plan.placements) {
    for (const s of placementBloomSeasons(placement, index)) covered.add(s)
  }
  // Only speak up once at least *some* bloom data is present — an all-unknown
  // plan (no bloom seasons resolved) would flag all four seasons uselessly.
  if (covered.size === 0) return []

  const findings: Finding[] = []
  for (const season of SEASONS) {
    if (!covered.has(season)) {
      findings.push({
        key: `bloom_gap:${season}`,
        ruleId: 'bloom_gap',
        severity: 'suggestion',
        message: `${cap(season)} looks quiet — want something blooming then?`,
        why: 'A bloom in every season keeps the garden lively for you and feeds pollinators through the lean stretches.',
        anchor: 'bloom-succession',
      })
    }
  }
  return findings
}

// ── Rule 3 — height inversion ─────────────────────────────────────────────────

export const heightInversion: Rule = ({ plan, index }) => {
  const findings: Finding[] = []

  for (const section of plan.sections) {
    const ve = viewingEdge(section, plan)
    if (!ve) continue
    const interior = polygonCentroid(section.polygon)

    // Placements with a resolvable point + a mature height (matrixFill has no
    // single point and is the ground plane anyway — skip it for inversion).
    const placed = plan.placements
      .filter((p) => p.sectionId === section.id && p.kind !== 'matrixFill')
      .map((p) => {
        const slug = placementSlugs(p)[0]
        const point = placementAnchorPoint(p)
        const height = matureHeightFt(index.get(slug))
        return point && height != null
          ? { placement: p, depth: depthFromEdge(point, ve.edge, interior), height, slug }
          : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    // Compare every front/back pair; fire on a big inversion (front much taller).
    for (let i = 0; i < placed.length; i++) {
      for (let j = 0; j < placed.length; j++) {
        if (i === j) continue
        const front = placed[i]
        const back = placed[j]
        if (front.depth >= back.depth) continue // front must be nearer the viewer
        const tallerInFront =
          front.height > back.height * INVERSION_RATIO &&
          front.height - back.height > INVERSION_MIN_FT
        if (!tallerInFront) continue

        findings.push({
          key: `height_inversion:${front.placement.id}:${back.placement.id}`,
          ruleId: 'height_inversion',
          severity: 'suggestion',
          sectionId: section.id,
          placementId: front.placement.id,
          message: `${plantName(front.slug, index)} sits in front of the shorter ${plantName(
            back.slug,
            index,
          )} — swapping their order would open up the view (unless you want that see-through screen).`,
          why: 'Tall-back, short-front lets you see the whole planting; the dismiss is here for the wispy plants you can see straight through.',
          anchor: 'planting-design-heuristics',
        })
      }
    }
  }
  return findings
}

// ── Rule 4 — lonely drift ─────────────────────────────────────────────────────

export const lonelyDrift: Rule = ({ plan, index }) => {
  const findings: Finding[] = []
  for (const placement of plan.placements) {
    if (placement.layerRole === 'structural') continue // a lone specimen is fine
    let count: number | null = null
    if (placement.kind === 'drift') count = placement.count
    else if (placement.kind === 'individual') count = 1
    if (count == null || count < 1 || count > LONELY_MAX_COUNT) continue

    const slug = placementSlugs(placement)[0]
    findings.push({
      key: `lonely_drift:${placement.id}`,
      ruleId: 'lonely_drift',
      severity: 'suggestion',
      sectionId: placement.sectionId,
      placementId: placement.id,
      message: `Just ${count} ${plantName(slug, index)} here — a triangle of 3 (or 5) reads as intentional rather than accidental.`,
      why: 'Grouping non-structural plants in odd threes and fives makes a drift instead of a stray; one of twenty things looks scattered.',
      anchor: 'planting-design-heuristics',
    })
  }
  return findings
}

// ── Rule 5 — no repetition ────────────────────────────────────────────────────
// Species-level only: color data isn't reliable in the corpus yet, so we check
// species repetition and document the color half as deferred. Multi-section
// plans only — a single-section plan can't "repeat across the plan".

export const noRepetition: Rule = ({ plan }) => {
  if (plan.sections.length < 2) return []
  // Count the distinct sections each species appears in.
  const sectionsBySpecies = new Map<string, Set<string>>()
  for (const placement of plan.placements) {
    for (const slug of placementSlugs(placement)) {
      const set = sectionsBySpecies.get(slug) ?? new Set<string>()
      set.add(placement.sectionId)
      sectionsBySpecies.set(slug, set)
    }
  }
  const distinctSpecies = [...sectionsBySpecies.keys()]
  if (distinctSpecies.length === 0) return []

  // A plan where *every* species appears in exactly one section has no thread
  // tying the rooms together. Surface it once, plan-level (not per species — that
  // would be a wall of near-identical nudges).
  const anyRepeated = distinctSpecies.some((slug) => (sectionsBySpecies.get(slug)?.size ?? 0) >= 2)
  if (anyRepeated) return []

  return [
    {
      key: 'no_repetition:plan',
      ruleId: 'no_repetition',
      severity: 'suggestion',
      message: 'Every plant appears in only one section — repeating a favorite or two across beds is the simplest way to make the whole yard feel like one garden.',
      why: 'Repetition is the main tool for cohesion; a shared species threads separate beds into a single composition. (Color repetition is a future check — that data isn’t reliable yet.)',
      anchor: 'planting-design-heuristics',
    },
  ]
}

// ── Rule 6 — no grasses/sedges ────────────────────────────────────────────────

export const noGrasses: Rule = ({ plan, index }) => {
  if (plan.placements.length === 0) return []
  const hasGrass = plan.placements.some((p) =>
    placementSlugs(p).some((slug) => index.get(slug)?.plant_type === 'grass'),
  )
  if (hasGrass) return []
  return [
    {
      key: 'no_grasses:plan',
      ruleId: 'no_grasses',
      severity: 'suggestion',
      message: 'No grasses or sedges yet — even a few bunchgrasses add movement and give critters somewhere to overwinter.',
      why: 'Grasses carry structure and motion through the year and knit the matrix layer together; a bed of only forbs can feel static.',
      anchor: 'planting-design-heuristics',
    },
  ]
}

// ── Rule 7 — crowding (landscaped only) ───────────────────────────────────────
// Overlapping mature-width circles for *individuals* in landscaped sections.
// Naturalistic sections overlap by design and are skipped (spec). Only
// individuals have a point + a footprint circle; drift/matrixFill model
// populations, not spacing, so they're out of scope here.

export const crowding: Rule = ({ plan, index }) => {
  const findings: Finding[] = []
  const seenPairs = new Set<string>()

  for (const section of plan.sections) {
    if (section.densityStyle !== 'landscaped') continue
    const individuals = plan.placements.filter(
      (p): p is Extract<Placement, { kind: 'individual' }> =>
        p.sectionId === section.id && p.kind === 'individual',
    )

    for (let i = 0; i < individuals.length; i++) {
      for (let j = i + 1; j < individuals.length; j++) {
        const a = individuals[i]
        const b = individuals[j]
        const wa = matureWidthFt(index.get(a.plantSlug))
        const wb = matureWidthFt(index.get(b.plantSlug))
        if (wa == null || wb == null) continue // no size data → no crowding claim
        const centerDist = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y)
        const needed = wa / 2 + wb / 2 + CROWDING_CLEARANCE_FT
        if (centerDist >= needed) continue

        const pairKey = [a.id, b.id].sort().join(':')
        if (seenPairs.has(pairKey)) continue
        seenPairs.add(pairKey)

        findings.push({
          key: `crowding:${pairKey}`,
          ruleId: 'crowding',
          severity: 'worth_a_look',
          sectionId: section.id,
          placementId: a.id,
          message: `${plantName(a.plantSlug, index)} and ${plantName(
            b.plantSlug,
            index,
          )} will grow into each other at maturity — a little more space keeps both looking their best.`,
          why: 'Landscaped spacing leaves about a foot of clearance so mature foliage just touches instead of crowding; here their circles overlap.',
          anchor: 'plant-spacing',
        })
      }
    }
  }
  return findings
}

// ── Rule 8 — too big for the bed ──────────────────────────────────────────────
// Two triggers: (a) mature width > the section's narrow dimension (bounding-box
// min side, a documented approximation of "the polygon's minimum width"); and
// (b) foundation clearance — an individual within width/2 + 1 ft of a `building`
// obstruction edge.

export const tooBig: Rule = ({ plan, index }) => {
  const findings: Finding[] = []
  const buildings = plan.baseMap.obstructions.filter((o) => o.kind === 'building')

  for (const section of plan.sections) {
    const bounds = polygonBounds(section.polygon)
    const narrowFt = Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)

    const placements = plan.placements.filter((p) => p.sectionId === section.id)
    for (const placement of placements) {
      // (a) width vs. narrow dimension — one finding per (placement, section).
      for (const slug of placementSlugs(placement)) {
        const width = matureWidthFt(index.get(slug))
        if (width == null) continue
        if (narrowFt > 0 && width > narrowFt) {
          findings.push({
            key: `too_big:width:${placement.id}:${slug}`,
            ruleId: 'too_big',
            severity: 'worth_a_look',
            sectionId: section.id,
            placementId: placement.id,
            message: `${plantName(slug, index)} matures wider (${round(width)} ft) than ${sectionName(
              section,
            )} is narrow (${round(narrowFt)} ft) — it may outgrow this spot.`,
            why: 'A plant wider than the bed will crowd its edges as it fills in; picking one sized to the space saves pruning battles later.',
            anchor: 'plant-spacing',
          })
        }
      }

      // (b) foundation clearance — individuals only (they have a point).
      if (placement.kind === 'individual' && buildings.length > 0) {
        const width = matureWidthFt(index.get(placement.plantSlug))
        if (width == null) continue
        const clearance = width / 2 + FOUNDATION_MIN_CLEARANCE_FT
        for (const b of buildings) {
          const dist = distanceToPolygonEdge(placement.center, b.footprint)
          const insideBuilding = pointInPolygon(placement.center, b.footprint)
          if (!insideBuilding && dist >= clearance) continue
          findings.push({
            key: `too_big:foundation:${placement.id}:${b.id}`,
            ruleId: 'too_big',
            severity: 'worth_a_look',
            sectionId: section.id,
            placementId: placement.id,
            message: `${plantName(
              placement.plantSlug,
              index,
            )} is close to the house — its mature foliage would press against the wall.`,
            why: 'Leaving at least a foot (ideally two) between mature foliage and a foundation keeps air moving and roots off the structure.',
            anchor: 'plant-spacing',
          })
          break // one foundation finding per placement is enough
        }
      }
    }
  }
  return findings
}

// ── Rule 9 — sun/water mismatch ───────────────────────────────────────────────

export const sunWaterMismatch: Rule = ({ plan, index }) => {
  const findings: Finding[] = []
  const sectionById = new Map(plan.sections.map((s) => [s.id, s]))

  for (const placement of plan.placements) {
    const section = sectionById.get(placement.sectionId)
    if (!section) continue
    for (const slug of placementSlugs(placement)) {
      const plant = index.get(slug)
      if (!plant) continue
      const sunOff = sunExcludes(section.labels.sun, plant)
      const waterOff = waterExcludes(section.labels.moisture, plant)
      if (!sunOff && !waterOff) continue

      const which = sunOff && waterOff ? 'light and moisture' : sunOff ? 'light' : 'moisture'
      findings.push({
        key: `sun_water_mismatch:${placement.id}:${slug}`,
        ruleId: 'sun_water_mismatch',
        severity: 'suggestion',
        sectionId: section.id,
        placementId: placement.id,
        message: `${plantName(slug, index)} may want different ${which} than ${sectionName(
          section,
        )} offers — worth a second look, though you may know this spot better than the data does.`,
        why: 'Matching a plant to its light and water is the biggest lever for it thriving with little fuss; a mismatch means more coddling.',
        anchor: 'sun-requirements',
      })
    }
  }
  return findings
}

// ── Rule 10 — sightline conflict ──────────────────────────────────────────────
// SiteProfile.sightlines are *labeled, not geometric* (kind + description, no
// coordinates). So we implement label-level checks and document what the data
// can't support:
//   • highlight — a corridor to keep open. Data can't tell us *which* section is
//     in it, so we can't fire per-placement. Instead: if the plan has a highlight
//     sightline AND any section holds a tall (>4 ft) placement, nudge once to
//     check nothing tall blocks the view. (Simplification: plan-level, not the
//     spec's "tall placement inside a highlight corridor" — we lack the corridor.)
//   • privacy — needs a tall evergreen screen *somewhere*. We can check the plan
//     has at least one tall placement; evergreen-ness isn't in the corpus, so we
//     say "tall screen" and note the evergreen caveat in copy.
//   • disguise — "target still visible" is ungeometric; we nudge to confirm a
//     tall planting hides it. (Simplification documented.)

export const sightlineConflict: Rule = ({ plan, profile, index }) => {
  const sightlines = profile?.sightlines ?? []
  if (sightlines.length === 0) return []
  const findings: Finding[] = []

  const anyTall = plan.placements.some((p) =>
    placementSlugs(p).some((slug) => {
      const h = matureHeightFt(index.get(slug))
      return h != null && h > TALL_FT
    }),
  )

  for (const s of sightlines) {
    if (s.kind === 'highlight' && anyTall) {
      findings.push({
        key: `sightline_conflict:highlight:${s.id}`,
        ruleId: 'sightline_conflict',
        severity: 'suggestion',
        message: `You wanted to keep this view open (${clip(s.description)}) — worth checking none of your taller plants land in the way as they grow.`,
        why: 'A view you love is easy to plant shut by accident; keeping the tall stuff clear of the sightline protects it.',
        anchor: 'planting-design-heuristics',
      })
    }
    if (s.kind === 'privacy' && !anyTall) {
      findings.push({
        key: `sightline_conflict:privacy:${s.id}`,
        ruleId: 'sightline_conflict',
        severity: 'suggestion',
        message: `You wanted more privacy here (${clip(s.description)}) — there’s nothing tall in the plan yet to screen it. A tall evergreen would do the most work.`,
        why: 'A privacy screen needs height and, ideally, year-round leaves; nothing over about 4 ft is placed to do that job yet.',
        anchor: 'planting-design-heuristics',
      })
    }
    if (s.kind === 'disguise') {
      findings.push({
        key: `sightline_conflict:disguise:${s.id}`,
        ruleId: 'sightline_conflict',
        severity: 'suggestion',
        message: `You wanted to hide something here (${clip(s.description)}) — worth confirming a tall planting actually covers it once grown in.`,
        why: 'Disguising an eyesore takes real height in the right spot; the plan can’t see where it is, so this one’s a manual check.',
        anchor: 'planting-design-heuristics',
      })
    }
  }
  return findings
}

// ── Rule 11 — utility conflict ────────────────────────────────────────────────

export const utilityConflict: Rule = ({ plan, profile, index }) => {
  const findings: Finding[] = []
  const utilities = profile?.utilities

  // (a) Tree placed while overhead lines are present. No line geometry in the
  // data — plan-level nudge, fired once if any tree is placed (documented).
  if (utilities?.overheadLines) {
    const treePlacement = plan.placements.find((p) =>
      placementSlugs(p).some((slug) => index.get(slug)?.plant_type === 'tree'),
    )
    if (treePlacement) {
      findings.push({
        key: 'utility_conflict:overhead:plan',
        ruleId: 'utility_conflict',
        severity: 'worth_a_look',
        message: 'You’ve got overhead lines and a tree in the plan — worth siting the tree clear of them (or choosing one that stays short beneath them).',
        why: 'A tree that grows into power lines means a lifetime of hard pruning or removal; the fix is placement now, not later.',
        anchor: 'planting-design-heuristics',
      })
    }
  }

  // (b) Any digging-phase section while 811 isn't done. Renders the tel:811
  // action in the panel (spec). One finding per affected section.
  if (utilities && utilities.called811 !== 'done') {
    const diggingStates = new Set(['cleanup', 'prepped', 'planted'])
    for (const section of plan.sections) {
      if (!diggingStates.has(section.phaseState)) continue
      findings.push({
        key: `utility_conflict:811:${section.id}`,
        ruleId: 'utility_conflict',
        severity: 'worth_a_look',
        sectionId: section.id,
        message: `Before digging in ${sectionName(section)}, it’s worth calling 811 — they mark buried utilities for free so you dig with confidence.`,
        why: 'Calling 811 a few days before digging is free and keeps you clear of buried gas, water, and power lines.',
        anchor: 'phased-planting',
      })
    }
  }
  return findings
}

// ── Rule 12 — unreachable depth ───────────────────────────────────────────────
// A section interior point more than ~5 ft from *every* path polyline and every
// section edge is a spot you can't comfortably reach to plant or weed. Grid-
// sample the polygon (A's geometry) and test point-to-path + point-to-edge.

export const unreachableDepth: Rule = ({ plan }) => {
  const findings: Finding[] = []
  const paths = pathSegments(plan)

  for (const section of plan.sections) {
    if (section.polygon.length < 3) continue
    const bounds = polygonBounds(section.polygon)
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    if (width <= 0 || height <= 0) continue

    // Sample on a ~2 ft grid, capped so a huge yard doesn't explode the loop.
    const step = 2
    const cols = Math.min(60, Math.max(1, Math.ceil(width / step)))
    const rows = Math.min(60, Math.max(1, Math.ceil(height / step)))
    let unreachable = false

    for (let r = 0; r <= rows && !unreachable; r++) {
      for (let c = 0; c <= cols && !unreachable; c++) {
        const point = {
          x: bounds.minX + (width * c) / cols,
          y: bounds.minY + (height * r) / rows,
        }
        if (!pointInPolygon(point, section.polygon)) continue
        const edgeDist = distanceToPolygonEdge(point, section.polygon)
        if (edgeDist <= UNREACHABLE_FT) continue
        let pathDist = Infinity
        for (const seg of paths) {
          const d = pointToSegment(point, seg.a, seg.b)
          if (d < pathDist) pathDist = d
        }
        if (pathDist > UNREACHABLE_FT) unreachable = true
      }
    }

    if (unreachable) {
      findings.push({
        key: `unreachable_depth:${section.id}`,
        ruleId: 'unreachable_depth',
        severity: 'suggestion',
        sectionId: section.id,
        message: `There’s a spot in ${sectionName(section)} more than a comfortable arm’s reach from any path or edge — a little keyhole spur would make it easy to tend.`,
        why: 'Beds deeper than about five feet are hard to weed and plant without stepping in; a stepping-stone spur keeps every plant reachable.',
        anchor: 'paths-first-design',
      })
    }
  }
  return findings
}

// ── Rule 13 — phase-order smell ───────────────────────────────────────────────

export const phaseOrder: Rule = ({ plan }) => {
  const findings: Finding[] = []

  // (a) A season is planned for a section that's still untouched with no hold
  // method — the "cleared more than you can plant" smell inverted.
  for (const section of plan.sections) {
    const holding = section.holdMethod && section.holdMethod !== 'none'
    if (section.plannedSeason && section.phaseState === 'untouched' && !holding) {
      findings.push({
        key: `phase_order:hold:${section.id}`,
        ruleId: 'phase_order',
        severity: 'suggestion',
        sectionId: section.id,
        message: `${sectionName(section)} is slated for ${section.plannedSeason} but still untouched — a sheet of cardboard now keeps the weeds down until you get to it.`,
        why: 'A bed waiting its turn stays easy if you suppress it now; otherwise the weeds you cleared in Phase 1 come right back.',
        anchor: 'phased-planting',
      })
    }
  }

  // (b) Everything scheduled for the same season — the "ambition beats momentum"
  // smell. Only meaningful with 2+ sections that carry a planned season.
  const seasons = plan.sections.map((s) => s.plannedSeason).filter((s): s is string => !!s)
  if (seasons.length >= 2 && new Set(seasons).size === 1) {
    findings.push({
      key: 'phase_order:same_season:plan',
      ruleId: 'phase_order',
      severity: 'suggestion',
      message: `Every section is scheduled for ${seasons[0]} — spreading them across seasons keeps each one a manageable weekend instead of one exhausting push.`,
      why: 'Doing one section per planting window keeps momentum and lets you only clear as much ground as you have plants for.',
      anchor: 'phased-planting',
    })
  }
  return findings
}

// ── The ordered rule list ─────────────────────────────────────────────────────

export const ALL_RULES: Rule[] = [
  bareGround,
  bloomGap,
  heightInversion,
  lonelyDrift,
  noRepetition,
  noGrasses,
  crowding,
  tooBig,
  sunWaterMismatch,
  sightlineConflict,
  utilityConflict,
  unreachableDepth,
  phaseOrder,
]

// ── Small formatting helpers ──────────────────────────────────────────────────

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

/** Trim a user description for inline copy so a long note doesn't blow up the line. */
function clip(s: string, max = 60): string {
  const t = s.trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}
