'use client'

// BloomTintLayer — unit G, module 3.
//
// A CanvasStage child that renders a season-sensitive tint pass over placements
// in feet-space (SVG). Three visual states:
//
//   in_bloom  → warm amber halo/ring around the placement shape
//   partial   → soft warm ring at reduced opacity (some species in the mix bloom)
//   quiet     → slight desaturation overlay (cool grey wash, very subtle)
//
// Geometry recomputed from the same placement data PlacementLayer uses — no
// import of PlacementLayer itself (spec: "recompute from the same data, don't
// import PlacementLayer"):
//   individual → circle at mature radius (width_ft_max / 2, min 2 ft)
//   drift      → the traced area polygon
//   matrixFill → the section polygon
//
// Kept subtle: the base map + placement markers must stay readable underneath.
// The tint is a *guide*, not a replacement for the placement layer.

import { useMemo } from 'react'
import { useStage } from './CanvasStage'
import { bloomingSlugs, placementBloomState } from './bloom'
import { polygonCentroid } from './geometry'
import type { Season } from './sun'
import type { Placement, Section } from './types'
import type { SelectorPlant } from '../plant-selector/types'

// ── Visual constants ──────────────────────────────────────────────────────────

// Warm amber for in-bloom shapes — reads as "alive and active."
const IN_BLOOM_COLOR = '#c47828'
const IN_BLOOM_RING_OPACITY = 0.55
const IN_BLOOM_FILL_OPACITY = 0.12

// Muted version for partial bloom.
const PARTIAL_RING_OPACITY = 0.30
const PARTIAL_FILL_OPACITY = 0.06

// Cool desaturating wash for quiet placements.
const QUIET_FILL = '#8fa0a8'
const QUIET_FILL_OPACITY = 0.12

export interface BloomTintLayerProps {
  placements: Placement[]
  sections: Section[]
  season: Season
  /** Pre-built slug set for the active season — use bloomingSlugs(corpus, season). */
  bySlug: Set<string>
  /** Look a plant up by slug (for mature-width radius on individuals). */
  plantBySlug: (slug: string) => SelectorPlant | undefined
}

export default function BloomTintLayer({
  placements,
  sections,
  season,
  bySlug,
  plantBySlug,
}: BloomTintLayerProps) {
  const stage = useStage()

  const sectionMap = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  )

  return (
    <g pointerEvents="none" aria-hidden>
      {placements.map((placement) => {
        const state = placementBloomState(placement, season, bySlug)

        if (placement.kind === 'individual') {
          const plant = plantBySlug(placement.plantSlug)
          const widthFt = plant?.width_ft_range?.max ?? 2
          const rPx = Math.max(8, (widthFt / 2) * stage.vp.scale)
          const center = stage.toScreen(placement.center)

          if (state === 'in_bloom') {
            return (
              <g key={placement.id}>
                {/* Soft fill */}
                <circle
                  cx={center.sx}
                  cy={center.sy}
                  r={rPx * 1.35}
                  fill={IN_BLOOM_COLOR}
                  fillOpacity={IN_BLOOM_FILL_OPACITY}
                />
                {/* Warm ring */}
                <circle
                  cx={center.sx}
                  cy={center.sy}
                  r={rPx * 1.2}
                  fill="none"
                  stroke={IN_BLOOM_COLOR}
                  strokeWidth={2.5}
                  strokeOpacity={IN_BLOOM_RING_OPACITY}
                />
              </g>
            )
          }

          if (state === 'partial') {
            return (
              <circle
                key={placement.id}
                cx={center.sx}
                cy={center.sy}
                r={rPx * 1.15}
                fill="none"
                stroke={IN_BLOOM_COLOR}
                strokeWidth={1.5}
                strokeOpacity={PARTIAL_RING_OPACITY}
                strokeDasharray="4 3"
              />
            )
          }

          // quiet
          return (
            <circle
              key={placement.id}
              cx={center.sx}
              cy={center.sy}
              r={rPx}
              fill={QUIET_FILL}
              fillOpacity={QUIET_FILL_OPACITY}
            />
          )
        }

        if (placement.kind === 'drift') {
          const screen = placement.area.map((p) => stage.toScreen(p))
          const pts = screen.map((s) => `${s.sx},${s.sy}`).join(' ')

          if (state === 'in_bloom') {
            return (
              <polygon
                key={placement.id}
                points={pts}
                fill={IN_BLOOM_COLOR}
                fillOpacity={IN_BLOOM_FILL_OPACITY}
                stroke={IN_BLOOM_COLOR}
                strokeWidth={2.5}
                strokeOpacity={IN_BLOOM_RING_OPACITY}
                strokeLinejoin="round"
              />
            )
          }

          if (state === 'partial') {
            return (
              <polygon
                key={placement.id}
                points={pts}
                fill="none"
                stroke={IN_BLOOM_COLOR}
                strokeWidth={1.5}
                strokeOpacity={PARTIAL_RING_OPACITY}
                strokeDasharray="5 4"
                strokeLinejoin="round"
              />
            )
          }

          // quiet
          return (
            <polygon
              key={placement.id}
              points={pts}
              fill={QUIET_FILL}
              fillOpacity={QUIET_FILL_OPACITY}
            />
          )
        }

        // matrixFill — tint over the section region
        const section = sectionMap.get(placement.sectionId)
        if (!section) return null
        const screen = section.polygon.map((p) => stage.toScreen(p))
        const pts = screen.map((s) => `${s.sx},${s.sy}`).join(' ')

        if (state === 'in_bloom') {
          return (
            <polygon
              key={placement.id}
              points={pts}
              fill={IN_BLOOM_COLOR}
              fillOpacity={IN_BLOOM_FILL_OPACITY * 0.75}
              stroke={IN_BLOOM_COLOR}
              strokeWidth={2}
              strokeOpacity={IN_BLOOM_RING_OPACITY * 0.6}
            />
          )
        }

        if (state === 'partial') {
          return (
            <polygon
              key={placement.id}
              points={pts}
              fill={IN_BLOOM_COLOR}
              fillOpacity={PARTIAL_FILL_OPACITY}
              stroke={IN_BLOOM_COLOR}
              strokeWidth={1.5}
              strokeOpacity={PARTIAL_RING_OPACITY * 0.6}
              strokeDasharray="5 4"
            />
          )
        }

        // quiet
        return (
          <polygon
            key={placement.id}
            points={pts}
            fill={QUIET_FILL}
            fillOpacity={QUIET_FILL_OPACITY * 0.6}
          />
        )
      })}
    </g>
  )
}
