'use client'

// Season scrubber — unit G, module 2.
//
// The shared season control for the bed planner. Presentational: props in,
// onChange out, no own state. Designed to be the single season source at wiring
// time (unit I) — it drives both the bloom tint (unit G's BloomTintLayer) and
// the sun/shade timelapse season half (unit H's SunShadeLayer / TimelapseControls).
//
// Pill styling matches TimelapseControls exactly (same border-radius, same
// active/inactive fill, same type scale) so the two controls read as a system
// when composed in the Check & Preview step.

import type { Season } from './sun'
import { SEASONS } from './sun'

const SEASON_LABELS: Record<Season, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
}

export interface SeasonScrubberProps {
  season: Season
  onChange: (season: Season) => void
  /**
   * Optional per-season bloom count, shown as a small badge on each pill.
   * A season with zero active blooming placements shows "0" — the checker's
   * territory is deciding what to do about it; we just show the number.
   */
  bloomCounts?: Record<Season, number>
}

export default function SeasonScrubber({ season, onChange, bloomCounts }: SeasonScrubberProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#2a1d10]/55">Season</p>
      <div className="flex flex-wrap gap-1.5">
        {SEASONS.map((s) => {
          const count = bloomCounts?.[s]
          return (
            <SeasonPill key={s} active={season === s} onClick={() => onChange(s)}>
              {SEASON_LABELS[s]}
              {count !== undefined && (
                <span
                  className={
                    'ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ' +
                    (season === s
                      ? 'bg-[#f7e9c9]/30 text-[#f7e9c9]'
                      : count > 0
                        ? 'bg-[#c47828]/20 text-[#7a4828]'
                        : 'bg-[#2a1d10]/12 text-[#2a1d10]/55')
                  }
                >
                  {count}
                </span>
              )}
            </SeasonPill>
          )
        })}
      </div>
    </div>
  )
}

function SeasonPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition ' +
        (active
          ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
          : 'border-[#2a1d10]/25 bg-transparent text-[#2a1d10]/80 hover:border-[#2a1d10]/50')
      }
    >
      {children}
    </button>
  )
}
