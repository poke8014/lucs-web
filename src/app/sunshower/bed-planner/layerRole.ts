// Layer-role + placement-kind suggestion heuristic.
//
// Answers: "What design role does this plant likely play, and how should you
// place it?" — a suggestion the user can always override, never a gate.
//
// Primary signal: `sociability` (1–5 scale, vault/concepts/plant-sociability.md):
//   1–2  → individual/solitary — structural or feature seasonal plants
//   3    → small drifts — seasonal theme
//   4–5  → matrix spreaders — groundcover / filler
//
// Sociability is currently unset on all 150 CA natives (scale defined, values
// sourced from Eastern-US/European references with no CA data). When unset,
// fall back to plant_type + mature height + communities — always marked
// confidence: 'low' so the UI can show a caveat. Sociability-derived results
// are confidence: 'medium' (human-labeled values still warrant user review).
// A future sociability backfill upgrades the result in place.
//
// Fallback heuristic tiers (vault/concepts/planting-layers):
//   structural 10–15% → trees + large shrubs (height_ft_range.max > 8 ft)
//   seasonal 25–40%   → mid-height shrubs + perennials (2–8 ft)
//   groundcover ~50%  → grasses, low perennials (≤ 2 ft), vines
//   filler 5–10%      → annuals + short-lived self-seeders

import type { LayerRole } from './types'
import type { SelectorPlant } from '../plant-selector/types'

// ── Public types ─────────────────────────────────────────────────────────────

export type PlacementKind = 'individual' | 'drift' | 'matrixFill'

export interface PlacementSuggestion {
  layerRole: LayerRole
  kind: PlacementKind
  confidence: 'low' | 'medium'
  reason: string
}

// ── Sociability-based suggestion ─────────────────────────────────────────────
// Sociability 1–2 = loner/specimen → individual.
// Sociability 3   = small group    → drift.
// Sociability 4–5 = spreader       → matrixFill.

function fromSociability(
  sociability: number,
  plant: SelectorPlant,
): PlacementSuggestion {
  const name = plant.common_names[0] ?? plant.scientific_name

  if (sociability <= 2) {
    return {
      layerRole: 'structural',
      kind: 'individual',
      confidence: 'medium',
      reason: `${name} naturally grows as a solitary or small-group plant — place it as an individual for maximum impact.`,
    }
  }

  if (sociability === 3) {
    return {
      layerRole: 'seasonal',
      kind: 'drift',
      confidence: 'medium',
      reason: `${name} looks best in a small drift of 3–7 — give it room to be a seasonal feature.`,
    }
  }

  // sociability 4–5
  return {
    layerRole: 'groundcover',
    kind: 'matrixFill',
    confidence: 'medium',
    reason: `${name} is a natural spreader — plant it as part of a ground-covering mix and let it fill in.`,
  }
}

// ── Fallback: plant_type + height + communities ───────────────────────────────
// Height thresholds:
//   canopy / large shrub: max > 8 ft  → structural + individual
//   mid-height (2–8 ft):              → seasonal + drift
//   low (≤ 2 ft):                     → groundcover + matrixFill
//
// plant_type overrides height in clear cases:
//   grass      → groundcover / matrixFill (bunchgrasses anchor the matrix layer)
//   annual     → filler / matrixFill (self-seeding fillers)
//   vine       → seasonal / drift (often used as a seasonal feature)
//   tree       → structural / individual (regardless of size recorded)

function fromFallback(plant: SelectorPlant): PlacementSuggestion {
  const name = plant.common_names[0] ?? plant.scientific_name
  const type = plant.plant_type
  const maxH = plant.height_ft_range?.max ?? null

  // Trees → always structural. A tree is a tree.
  if (type === 'tree') {
    return {
      layerRole: 'structural',
      kind: 'individual',
      confidence: 'low',
      reason: `${name} is a tree — place it as an individual structural anchor. It'll be the biggest commitment in the section.`,
    }
  }

  // Annuals + short-lived self-seeders → filler layer.
  if (type === 'annual') {
    return {
      layerRole: 'filler',
      kind: 'matrixFill',
      confidence: 'low',
      reason: `${name} is a short-lived annual — scatter it as filler to cover open soil and self-seed into gaps.`,
    }
  }

  // Grasses → groundcover matrix (bunchgrasses are the functional layer workhorse).
  if (type === 'grass') {
    return {
      layerRole: 'groundcover',
      kind: 'matrixFill',
      confidence: 'low',
      reason: `${name} is a grass — it naturally fills the ground-cover layer. Works well mixed with low forbs.`,
    }
  }

  // Vines → seasonal feature, placed as a drift or individual against a structure.
  if (type === 'vine') {
    return {
      layerRole: 'seasonal',
      kind: 'drift',
      confidence: 'low',
      reason: `${name} is a vine — plan it as a seasonal feature on a fence or trellis, usually one or a small group.`,
    }
  }

  // Shrubs + perennials: size decides.
  if (maxH != null) {
    // Large shrubs (>8 ft): structural backbone.
    if (maxH > 8) {
      return {
        layerRole: 'structural',
        kind: 'individual',
        confidence: 'low',
        reason: `${name} can get over 8 ft — give it a structural spot and treat it as an individual. It'll carry the section year-round.`,
      }
    }

    // Low (≤2 ft): likely a groundcover-type perennial or low shrub.
    if (maxH <= 2) {
      return {
        layerRole: 'groundcover',
        kind: 'matrixFill',
        confidence: 'low',
        reason: `${name} stays low (under 2 ft) — plant it as part of the ground-cover matrix to suppress weeds and hold soil.`,
      }
    }

    // Mid-range (2–8 ft): seasonal theme candidate.
    return {
      layerRole: 'seasonal',
      kind: 'drift',
      confidence: 'low',
      reason: `${name} is a mid-height ${type ?? 'plant'} — plant it in small drifts (3–5) for a seasonal color or texture moment.`,
    }
  }

  // No size data, no clear type signal → default seasonal drift.
  return {
    layerRole: 'seasonal',
    kind: 'drift',
    confidence: 'low',
    reason: `We don't have size data for ${name} yet — a small seasonal drift is a reasonable starting point.`,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * suggestPlacement — layer-role + placement-kind heuristic.
 *
 * Returns a suggestion with:
 *   - `layerRole`: which of the four planting layers this plant likely fills
 *   - `kind`: how to represent it on the plan (individual / drift / matrixFill)
 *   - `confidence`: 'medium' when derived from sociability data, 'low' when
 *     inferred from type + size (sociability is unset on all 150 CA natives)
 *   - `reason`: a plain friendly sentence for the UI (hover/tap tooltip)
 *
 * This is always a suggestion — the user overrides at placement time (unit E).
 * When `sociability` values land via a backfill, confidence upgrades in place.
 */
export function suggestPlacement(plant: SelectorPlant): PlacementSuggestion {
  // Sociability is the stronger signal — use it when set.
  if (plant.sociability != null) {
    return fromSociability(plant.sociability, plant)
  }

  // Fall back to type + size heuristic.
  return fromFallback(plant)
}
