'use client'

// AnnotationLayer — unit G, module 5a.
//
// A CanvasStage child that renders all annotations in feet-space (SVG).
// Presentational: props in, callbacks out — no own state except hover.
//
// Rendering rules:
//   Point kinds (wet_spot, hose_bib, keeper_plant, note) →
//     a small circle marker with the kind's icon character at the center,
//     plus the optional note as a tooltip-style label on hover or selection.
//
//   Polygon kinds (utility) →
//     a dashed translucent region (fill + dashed stroke), with the icon at
//     the polygon's centroid and a hover/selected note label.
//
// Selection state (selectedId) is driven externally — the parent tracks which
// annotation is selected; this layer just applies the selected ring and routes
// the onSelect callback.

import { useState } from 'react'
import { useStage } from './CanvasStage'
import { annotationLabel, isPointAnnotation } from './annotations'
import { polygonCentroid } from './geometry'
import type { Annotation, Point, Polygon } from './types'

// ── Visual constants ──────────────────────────────────────────────────────────

const MARKER_R = 12 // px radius of point markers
const MARKER_FILL = '#fff6df'
const MARKER_STROKE = '#2a1d10'
const MARKER_STROKE_SELECTED = '#c47828'
const POLY_FILL = '#6b7fa8'
const POLY_FILL_OPACITY = 0.15
const POLY_STROKE = '#3a4d72'
const POLY_STROKE_OPACITY = 0.6

// ── Main component ────────────────────────────────────────────────────────────

export interface AnnotationLayerProps {
  annotations: Annotation[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

export default function AnnotationLayer({
  annotations,
  selectedId,
  onSelect,
}: AnnotationLayerProps) {
  return (
    <g>
      {annotations.map((a) =>
        isPointAnnotation(a) ? (
          <PointMarker
            key={a.id}
            annotation={a}
            geometry={a.geometry as Point}
            selected={a.id === selectedId}
            onSelect={onSelect}
          />
        ) : (
          <PolygonRegion
            key={a.id}
            annotation={a}
            geometry={a.geometry as Polygon}
            selected={a.id === selectedId}
            onSelect={onSelect}
          />
        ),
      )}
    </g>
  )
}

// ── PointMarker ───────────────────────────────────────────────────────────────

function PointMarker({
  annotation,
  geometry,
  selected,
  onSelect,
}: {
  annotation: Annotation
  geometry: Point
  selected: boolean
  onSelect?: (id: string) => void
}) {
  const stage = useStage()
  const [hovered, setHovered] = useState(false)
  const { sx, sy } = stage.toScreen(geometry)
  const meta = annotationLabel(annotation.kind)
  const showNote = (hovered || selected) && annotation.note

  return (
    <g
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        onSelect?.(annotation.id)
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Selected ring */}
      {selected && (
        <circle
          cx={sx}
          cy={sy}
          r={MARKER_R + 4}
          fill="none"
          stroke={MARKER_STROKE_SELECTED}
          strokeWidth={2}
          strokeOpacity={0.7}
        />
      )}

      {/* Marker background */}
      <circle
        cx={sx}
        cy={sy}
        r={MARKER_R}
        fill={MARKER_FILL}
        stroke={selected ? MARKER_STROKE_SELECTED : MARKER_STROKE}
        strokeWidth={selected ? 2 : 1.5}
        strokeOpacity={0.7}
      />

      {/* Emoji icon */}
      <text
        x={sx}
        y={sy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        pointerEvents="none"
        aria-hidden
      >
        {meta.icon}
      </text>

      {/* Note label on hover/selection */}
      {showNote && (
        <NoteLabel sx={sx} sy={sy - MARKER_R - 6} text={annotation.note!} />
      )}
    </g>
  )
}

// ── PolygonRegion ─────────────────────────────────────────────────────────────

function PolygonRegion({
  annotation,
  geometry,
  selected,
  onSelect,
}: {
  annotation: Annotation
  geometry: Polygon
  selected: boolean
  onSelect?: (id: string) => void
}) {
  const stage = useStage()
  const [hovered, setHovered] = useState(false)
  const screen = geometry.map((p) => stage.toScreen(p))
  const pts = screen.map((s) => `${s.sx},${s.sy}`).join(' ')
  const centroid = stage.toScreen(polygonCentroid(geometry))
  const meta = annotationLabel(annotation.kind)
  const showNote = (hovered || selected) && annotation.note

  return (
    <g
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        onSelect?.(annotation.id)
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Dashed translucent region */}
      <polygon
        points={pts}
        fill={POLY_FILL}
        fillOpacity={selected ? POLY_FILL_OPACITY * 1.6 : POLY_FILL_OPACITY}
        stroke={selected ? MARKER_STROKE_SELECTED : POLY_STROKE}
        strokeWidth={selected ? 2 : 1.5}
        strokeOpacity={POLY_STROKE_OPACITY}
        strokeDasharray="6 4"
      />

      {/* Icon at centroid */}
      <text
        x={centroid.sx}
        y={centroid.sy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        pointerEvents="none"
        aria-hidden
      >
        {meta.icon}
      </text>

      {/* Kind label */}
      <text
        x={centroid.sx}
        y={centroid.sy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fill={POLY_STROKE}
        stroke="#f7e9c9"
        strokeWidth={2.5}
        paintOrder="stroke"
        pointerEvents="none"
      >
        {meta.label}
      </text>

      {/* Note label on hover/selection */}
      {showNote && (
        <NoteLabel sx={centroid.sx} sy={centroid.sy - 16} text={annotation.note!} />
      )}
    </g>
  )
}

// ── NoteLabel ─────────────────────────────────────────────────────────────────

/** Small tooltip-style note label — appears above the marker/centroid. */
function NoteLabel({ sx, sy, text }: { sx: number; sy: number; text: string }) {
  // Rough width estimate: 6 px per character + 16 px padding.
  const approxW = Math.min(200, text.length * 6 + 16)
  const h = 20
  const x = sx - approxW / 2
  const y = sy - h - 2

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={approxW}
        height={h}
        rx={4}
        fill="#fff6df"
        stroke="#2a1d10"
        strokeWidth={1}
        strokeOpacity={0.25}
        fillOpacity={0.95}
      />
      <text
        x={sx}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fill="#2a1d10"
        fillOpacity={0.85}
      >
        {text.length > 28 ? text.slice(0, 27) + '…' : text}
      </text>
    </g>
  )
}
