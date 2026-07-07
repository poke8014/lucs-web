'use client'

// SunLabelOverlay — unit G, module 4.
//
// A CanvasStage child that tints each section polygon by its stated sun label
// (labels.sun — the 5-tier SunTier from the site-inventory walkthrough, not the
// computed shadow from unit H). This is the "stated-label" view, distinct from
// H's shadow-projection timelapse — the two can coexist (this tints sections,
// H adds a shadow overlay on top).
//
// Color scale (5 tiers, gentle so section names stay readable):
//   full_sun                  → pale warm gold   (#f5c842 at low opacity)
//   morning_sun_afternoon_shade → soft yellow-amber (#e8b840)
//   morning_shade_afternoon_sun → warm olive       (#b8a060)
//   dappled_shade             → muted sage green  (#8fa87a)
//   full_shade                → cool blue-grey    (#6b7fa8)
//
// `visible` prop lets the parent toggle the layer off without unmounting it
// (unit I can wire this to a "show sun labels" checkbox).
//
// Includes SunLegend — a compact screen-fixed legend chip (absolute-positioned
// by the parent via className or the default bottom-left corner style).

import { useMemo } from 'react'
import { useStage } from './CanvasStage'
import { polygonCentroid } from './geometry'
import type { SunTier } from '../site-inventory/types'
import type { Section } from './types'

// ── Color scale ───────────────────────────────────────────────────────────────

interface SunStyle {
  fill: string
  fillOpacity: number
  label: string
  /** Short label for the legend swatch. */
  legendLabel: string
}

const SUN_STYLES: Record<SunTier, SunStyle> = {
  full_sun: {
    fill: '#f5c842',
    fillOpacity: 0.28,
    label: 'Full sun',
    legendLabel: 'Full sun',
  },
  morning_sun_afternoon_shade: {
    fill: '#e8b840',
    fillOpacity: 0.22,
    label: 'Morning sun',
    legendLabel: 'Morning sun',
  },
  morning_shade_afternoon_sun: {
    fill: '#b8a060',
    fillOpacity: 0.22,
    label: 'Afternoon sun',
    legendLabel: 'Afternoon sun',
  },
  dappled_shade: {
    fill: '#8fa87a',
    fillOpacity: 0.24,
    label: 'Dappled shade',
    legendLabel: 'Dappled',
  },
  full_shade: {
    fill: '#6b7fa8',
    fillOpacity: 0.28,
    label: 'Full shade',
    legendLabel: 'Full shade',
  },
}

// Sections with no sun label get a neutral tint so the overlay is still
// visually complete — doesn't imply a sun value.
const UNLABELED_STYLE: SunStyle = {
  fill: '#2a1d10',
  fillOpacity: 0.04,
  label: 'Unlabeled',
  legendLabel: 'Unlabeled',
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface SunLabelOverlayProps {
  sections: Section[]
  /**
   * Toggle the overlay on/off without unmounting. When false the layer renders
   * nothing, but React keeps it in the tree so show/hide is a cheap re-render.
   */
  visible: boolean
}

export default function SunLabelOverlay({ sections, visible }: SunLabelOverlayProps) {
  const stage = useStage()

  if (!visible || sections.length === 0) return null

  return (
    <g pointerEvents="none" aria-hidden>
      {sections.map((section) => {
        const sun = section.labels.sun
        const style = sun ? SUN_STYLES[sun] : UNLABELED_STYLE
        const screen = section.polygon.map((p) => stage.toScreen(p))
        const pts = screen.map((s) => `${s.sx},${s.sy}`).join(' ')
        const labelPt = stage.toScreen(polygonCentroid(section.polygon))

        return (
          <g key={section.id}>
            <polygon
              points={pts}
              fill={style.fill}
              fillOpacity={style.fillOpacity}
              stroke={style.fill}
              strokeWidth={1}
              strokeOpacity={style.fillOpacity * 1.5}
            />
            {sun && (
              <text
                x={labelPt.sx}
                y={labelPt.sy + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fill={style.fill === '#6b7fa8' ? '#3a4d72' : '#6b4e10'}
                fillOpacity={0.8}
                stroke="#f7e9c9"
                strokeWidth={2.5}
                paintOrder="stroke"
                pointerEvents="none"
                style={{ fontStyle: 'italic' }}
              >
                {style.label}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

// ── SunLegend ─────────────────────────────────────────────────────────────────

const SUN_TIER_ORDER: SunTier[] = [
  'full_sun',
  'morning_sun_afternoon_shade',
  'morning_shade_afternoon_sun',
  'dappled_shade',
  'full_shade',
]

/**
 * A compact legend chip mapping each sun tier to its color swatch.
 * Meant to be positioned absolutely by the parent (e.g. bottom-left of the
 * canvas). Default styling is provided; pass `className` to override.
 */
export function SunLegend({ className }: { className?: string }) {
  return (
    <div
      className={
        'rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/92 px-3 py-2 shadow-sm ' +
        (className ?? '')
      }
    >
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#2a1d10]/55">
        Sun label
      </p>
      <div className="space-y-1">
        {SUN_TIER_ORDER.map((tier) => {
          const s = SUN_STYLES[tier]
          return (
            <div key={tier} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-5 flex-shrink-0 rounded-sm border"
                style={{
                  backgroundColor: s.fill,
                  opacity: s.fillOpacity * 3.5, // boost swatch opacity for legibility
                  borderColor: s.fill,
                }}
              />
              <span className="text-[11px] text-[#2a1d10]/75">{s.legendLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
