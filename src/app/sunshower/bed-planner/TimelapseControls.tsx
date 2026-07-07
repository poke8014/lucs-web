'use client'

import type { Season, TimeOfDay } from './sun'

// Sun/shade timelapse — unit H, module 5: the scrub control.
//
// Presentational only (props in, onChange out — no own state). Two independent
// axes: season (winter/spring/summer/fall) × time of day (morning/midday/
// afternoon). Kept independently controllable ON PURPOSE: unit I can later drive
// the *season* half from the shared bloom-season scrubber (unit G) while the
// time-of-day pills stay local — so one control can own season across both the
// bloom tint and the shadow overlay without entangling time of day.

const SEASONS: { value: Season; label: string }[] = [
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
]

const TIMES: { value: TimeOfDay; label: string; hint: string }[] = [
  { value: 'morning', label: 'Morning', hint: '9am' },
  { value: 'midday', label: 'Midday', hint: 'noon' },
  { value: 'afternoon', label: 'Afternoon', hint: '3pm' },
]

export default function TimelapseControls({
  season,
  timeOfDay,
  onChange,
}: {
  season: Season
  timeOfDay: TimeOfDay
  onChange: (next: { season: Season; timeOfDay: TimeOfDay }) => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-4">
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.12em] text-[#2a1d10]/55">
          Season
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SEASONS.map((s) => (
            <TimelapsePill
              key={s.value}
              active={season === s.value}
              onClick={() => onChange({ season: s.value, timeOfDay })}
            >
              {s.label}
            </TimelapsePill>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.12em] text-[#2a1d10]/55">
          Time of day
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TIMES.map((t) => (
            <TimelapsePill
              key={t.value}
              active={timeOfDay === t.value}
              onClick={() => onChange({ season, timeOfDay: t.value })}
            >
              {t.label}
              <span className="ml-1 text-[10px] opacity-60">{t.hint}</span>
            </TimelapsePill>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[#2a1d10]/60">
        Scrub the seasons to see how the shade actually moves. Winter shade is honest
        here — if a bed goes dark in December, morning sun usually comes back by spring.
      </p>
    </div>
  )
}

function TimelapsePill({
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
        'rounded-full border px-3 py-1.5 text-sm transition ' +
        (active
          ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
          : 'border-[#2a1d10]/25 bg-transparent text-[#2a1d10]/80 hover:border-[#2a1d10]/50')
      }
    >
      {children}
    </button>
  )
}
