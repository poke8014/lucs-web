'use client'

import { useMemo } from 'react'
import { useStage } from './CanvasStage'
import { shadowPolygons } from './shadows'
import type { Season, TimeOfDay } from './sun'
import type { Obstruction } from './types'

// Sun/shade timelapse — unit H, module 4: the shadow overlay layer.
//
// A CanvasStage child (renders in feet-space, reads the transform via useStage).
// Props-driven, NO own state — the season/time come from TimelapseControls
// (which unit I wires to the shared season scrubber). Semi-transparent cool-toned
// shadow fills; each obstruction's own footprint is drawn slightly darker so the
// caster reads distinctly from the shade it throws.

// Cool blue-grey shade — reads as shadow, not as a plant/section fill (those are
// the warm greens). Per-obstruction opacity (from the deciduous model) scales it.
const SHADOW_FILL = '#3b4a63'
const BASE_SHADOW_OPACITY = 0.28
const FOOTPRINT_FILL = '#26303f'
const FOOTPRINT_OPACITY = 0.4

export default function SunShadeLayer({
  obstructions,
  season,
  timeOfDay,
  northBearingDeg = 0,
}: {
  obstructions: Obstruction[]
  season: Season
  timeOfDay: TimeOfDay
  northBearingDeg?: number
}) {
  const stage = useStage()

  // Memoize the projection per (season, timeOfDay, obstructions, bearing) — the
  // state space is tiny and the compute is sub-ms, but this keeps a pan/zoom
  // re-render (which changes only the transform) from re-projecting shadows.
  const shadows = useMemo(
    () => shadowPolygons(obstructions, season, timeOfDay, northBearingDeg),
    [obstructions, season, timeOfDay, northBearingDeg],
  )

  return (
    <g pointerEvents="none" aria-hidden>
      {/* Shadow regions first (under the footprints). Each obstruction's swept
          region is one <path> of its rings with nonzero fill — the concave-safe
          union (see shadows.ts extrudeFootprint). */}
      {shadows.map((shadow) => (
        <path
          key={`shade-${shadow.obstructionId}`}
          d={ringsToPath(shadow.rings, (p) => stage.toScreen(p))}
          fill={SHADOW_FILL}
          fillOpacity={BASE_SHADOW_OPACITY * shadow.opacity}
          fillRule="nonzero"
        />
      ))}
      {/* The casters' own footprints, slightly darker, drawn on top. */}
      {shadows.map((shadow) => (
        <path
          key={`foot-${shadow.obstructionId}`}
          d={ringsToPath([shadow.footprint], (p) => stage.toScreen(p))}
          fill={FOOTPRINT_FILL}
          fillOpacity={FOOTPRINT_OPACITY}
        />
      ))}
    </g>
  )
}

/** Build one SVG path `d` from a set of rings (each a closed subpath). */
function ringsToPath(
  rings: { x: number; y: number }[][],
  toScreen: (p: { x: number; y: number }) => { sx: number; sy: number },
): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map((ring) => {
      const [head, ...rest] = ring.map(toScreen)
      const move = `M${head.sx},${head.sy}`
      const lines = rest.map((s) => `L${s.sx},${s.sy}`).join('')
      return `${move}${lines}Z`
    })
    .join('')
}
