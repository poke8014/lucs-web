'use client'

import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useStage } from './CanvasStage'
import { polygonCentroid } from './geometry'
import type { Placement, Point, Section } from './types'
import type { SelectorPlant } from '../plant-selector/types'

// ── Canvas layer: the placements a section carries ────────────────────────────
//
// Renders the three placement kinds the way the spec asks — never 300 dots:
//   individual → a mature-footprint circle (radius = width/2 ft) + species initial
//   drift      → a soft rounded blob (the traced polygon) with a "×N" label
//   matrixFill → a textured (hatched) region over the whole active section, with
//                the mix summary — positions are never drawn
//
// Selection + editing live in PlantStep; this layer draws state and routes taps.
// The active section's placements render solid; other sections' placements dim
// so the working context stays legible without hiding the rest of the plan.

// A palette of soft fills keyed by layer role — keeps the plan readable at a
// glance (structural reads heavier, ground cover lighter).
const LAYER_FILL: Record<string, { fill: string; stroke: string }> = {
  structural: { fill: 'rgba(120,72,40,0.30)', stroke: '#7a4828' },
  seasonal: { fill: 'rgba(196,120,40,0.28)', stroke: '#a9762f' },
  groundcover: { fill: 'rgba(74,93,35,0.26)', stroke: '#4a5d23' },
  filler: { fill: 'rgba(90,130,150,0.24)', stroke: '#4c748e' },
}

function fillFor(role: string) {
  return LAYER_FILL[role] ?? LAYER_FILL.seasonal
}

/** First letter of the plant's common (or scientific) name — the footprint label. */
function speciesInitial(plant: SelectorPlant | undefined): string {
  const name = plant?.common_names[0] ?? plant?.scientific_name ?? '?'
  return name.trim().charAt(0).toUpperCase() || '?'
}

export interface PlacementLayerProps {
  sections: Section[]
  placements: Placement[]
  activeSectionId: string | null
  selectedPlacementId: string | null
  /** Look a plant up by slug (for footprint radius + label). */
  plantBySlug: (slug: string) => SelectorPlant | undefined
  /** The in-progress drift trace, if the user is tracing one. */
  draftDrift: Point[] | null
  onSelectSection: (id: string) => void
  onSelectPlacement: (id: string) => void
  onMovePlacement: (id: string, center: Point) => void
}

export default function PlacementLayer({
  sections,
  placements,
  activeSectionId,
  selectedPlacementId,
  plantBySlug,
  draftDrift,
  onSelectSection,
  onSelectPlacement,
  onMovePlacement,
}: PlacementLayerProps) {
  const stage = useStage()

  return (
    <g>
      {/* Section outlines — the active one highlighted; tap a section to make it
          active. Drawn first so placements sit on top. */}
      {sections.map((section) => {
        const screen = section.polygon.map((p) => stage.toScreen(p))
        const d = screen.map((s) => `${s.sx},${s.sy}`).join(' ')
        const active = section.id === activeSectionId
        const label = stage.toScreen(polygonCentroid(section.polygon))
        return (
          <g key={section.id}>
            <polygon
              points={d}
              fill={active ? 'rgba(74,93,35,0.06)' : 'rgba(74,93,35,0.03)'}
              stroke={active ? '#4a5d23' : '#6b7d3a'}
              strokeWidth={active ? 2.5 : 1.5}
              strokeDasharray={active ? undefined : '4 4'}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation()
                onSelectSection(section.id)
              }}
            />
            {!active && (
              <text
                x={label.sx}
                y={label.sy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fill="#2a1d10"
                fillOpacity={0.5}
                stroke="#f7e9c9"
                strokeWidth={3}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {section.name}
              </text>
            )}
          </g>
        )
      })}

      {/* Placements — active section solid, others dimmed. */}
      {placements.map((placement) => {
        const dim = placement.sectionId !== activeSectionId
        const selected = placement.id === selectedPlacementId
        const common = {
          selected,
          dim,
          onSelect: () => onSelectPlacement(placement.id),
        }
        if (placement.kind === 'individual') {
          return (
            <IndividualMark
              key={placement.id}
              placement={placement}
              plant={plantBySlug(placement.plantSlug)}
              onMove={(c) => onMovePlacement(placement.id, c)}
              {...common}
            />
          )
        }
        if (placement.kind === 'drift') {
          return (
            <DriftBlob
              key={placement.id}
              placement={placement}
              plant={plantBySlug(placement.plantSlug)}
              {...common}
            />
          )
        }
        const section = sections.find((s) => s.id === placement.sectionId)
        if (!section) return null
        return (
          <MatrixRegion
            key={placement.id}
            placement={placement}
            section={section}
            {...common}
          />
        )
      })}

      {/* The in-progress drift trace — dashed, with corner dots. */}
      {draftDrift && draftDrift.length > 0 && (
        <g pointerEvents="none">
          <polygon
            points={draftDrift
              .map((p) => {
                const s = stage.toScreen(p)
                return `${s.sx},${s.sy}`
              })
              .join(' ')}
            fill="rgba(196,120,40,0.14)"
            stroke="#a9762f"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          {draftDrift.map((p, i) => {
            const s = stage.toScreen(p)
            return <circle key={i} cx={s.sx} cy={s.sy} r={4} fill={i === 0 ? '#a9762f' : '#2a1d10'} />
          })}
        </g>
      )}
    </g>
  )
}

// ── individual: a mature-footprint circle at the point ────────────────────────

function IndividualMark({
  placement,
  plant,
  selected,
  dim,
  onSelect,
  onMove,
}: {
  placement: Extract<Placement, { kind: 'individual' }>
  plant: SelectorPlant | undefined
  selected: boolean
  dim: boolean
  onSelect: () => void
  onMove: (center: Point) => void
}) {
  const stage = useStage()
  const [dragging, setDragging] = useState(false)
  const center = stage.toScreen(placement.center)
  // Mature footprint radius in feet → screen px via the viewport scale.
  const widthFt = plant?.width_ft_range?.max ?? 2
  const rPx = Math.max(6, (widthFt / 2) * stage.vp.scale)
  const style = fillFor(placement.layerRole)

  return (
    <g opacity={dim ? 0.4 : 1}>
      <circle
        cx={center.sx}
        cy={center.sy}
        r={rPx}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={selected ? 3 : 1.5}
        style={{ cursor: 'grab' }}
        onPointerDown={(e: ReactPointerEvent) => {
          e.stopPropagation()
          onSelect()
          setDragging(true)
          ;(e.target as Element).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e: ReactPointerEvent) => {
          if (!dragging) return
          e.stopPropagation()
          onMove(stage.eventToFeet(e))
        }}
        onPointerUp={(e: ReactPointerEvent) => {
          setDragging(false)
          ;(e.target as Element).releasePointerCapture(e.pointerId)
        }}
      />
      <text
        x={center.sx}
        y={center.sy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.min(rPx, 14)}
        fill="#2a1d10"
        pointerEvents="none"
        style={{ fontWeight: 600 }}
      >
        {speciesInitial(plant)}
      </text>
    </g>
  )
}

// ── drift: a soft rounded blob (the traced polygon) with a ×N label ───────────

function DriftBlob({
  placement,
  plant,
  selected,
  dim,
  onSelect,
}: {
  placement: Extract<Placement, { kind: 'drift' }>
  plant: SelectorPlant | undefined
  selected: boolean
  dim: boolean
  onSelect: () => void
}) {
  const stage = useStage()
  const screen = placement.area.map((p) => stage.toScreen(p))
  const style = fillFor(placement.layerRole)
  const label = stage.toScreen(polygonCentroid(placement.area))
  const name = plant?.common_names[0] ?? plant?.scientific_name ?? 'plant'

  return (
    <g opacity={dim ? 0.4 : 1}>
      {/* A rounded, translucent blob — never individual dots. strokeLinejoin
          'round' softens the traced corners toward a drift look. */}
      <polygon
        points={screen.map((s) => `${s.sx},${s.sy}`).join(' ')}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={selected ? 3 : 1.5}
        strokeLinejoin="round"
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      />
      <text
        x={label.sx}
        y={label.sy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fill="#2a1d10"
        stroke="#f7e9c9"
        strokeWidth={3}
        paintOrder="stroke"
        pointerEvents="none"
        style={{ fontWeight: 600 }}
      >
        {name} ×{placement.count}
      </text>
    </g>
  )
}

// ── matrixFill: a textured region over the whole section ──────────────────────

function MatrixRegion({
  placement,
  section,
  selected,
  dim,
  onSelect,
}: {
  placement: Extract<Placement, { kind: 'matrixFill' }>
  section: Section
  selected: boolean
  dim: boolean
  onSelect: () => void
}) {
  const stage = useStage()
  const screen = section.polygon.map((p) => stage.toScreen(p))
  const style = fillFor(placement.layerRole)
  const label = stage.toScreen(polygonCentroid(section.polygon))
  const patternId = `matrix-hatch-${placement.id}`
  const speciesCount = placement.mix.length

  return (
    <g opacity={dim ? 0.4 : 1}>
      <defs>
        {/* A subtle diagonal hatch — "a population, not individuals." */}
        <pattern
          id={patternId}
          width={8}
          height={8}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={8} height={8} fill={style.fill} />
          <line x1={0} y1={0} x2={0} y2={8} stroke={style.stroke} strokeWidth={1} strokeOpacity={0.5} />
        </pattern>
      </defs>
      <polygon
        points={screen.map((s) => `${s.sx},${s.sy}`).join(' ')}
        fill={`url(#${patternId})`}
        stroke={style.stroke}
        strokeWidth={selected ? 3 : 1.5}
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      />
      <text
        x={label.sx}
        y={label.sy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fill="#2a1d10"
        stroke="#f7e9c9"
        strokeWidth={3}
        paintOrder="stroke"
        pointerEvents="none"
        style={{ fontWeight: 600 }}
      >
        matrix · {speciesCount} species
      </text>
    </g>
  )
}
