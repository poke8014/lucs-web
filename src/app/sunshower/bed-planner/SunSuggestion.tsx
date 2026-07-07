'use client'

import type { SunTier } from '../site-inventory/types'
import type { SunSuggestion as SunSuggestionResult } from './sunHours'
import { SEASONS, type Season } from './sun'

// Sun/shade timelapse — unit H, module 6 (optional): the per-section suggestion
// card. Presentational — takes the computed result + an onAccept callback; the
// actual acceptance wiring (setting labels.sunSource = 'simulated' on the
// section, and never overwriting a stated label silently) is unit I's job.
//
// Advisory tone throughout (spec §copy): a suggestion the user can take or leave,
// never a correction of their stated label.

const TIER_LABEL: Record<SunTier, string> = {
  full_sun: 'full sun',
  morning_sun_afternoon_shade: 'morning sun, afternoon shade',
  morning_shade_afternoon_sun: 'morning shade, afternoon sun',
  dappled_shade: 'dappled shade',
  full_shade: 'full shade',
}

const SEASON_LABEL: Record<Season, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
}

export default function SunSuggestion({
  suggestion,
  statedTier,
  onAccept,
}: {
  suggestion: SunSuggestionResult
  /** The section's current user-stated label, if any — so we can be honest about agreement. */
  statedTier?: SunTier
  onAccept: (tier: SunTier) => void
}) {
  const agrees = statedTier === suggestion.tier
  return (
    <div className="space-y-2.5 rounded-lg border border-[#3b4a63]/25 bg-[#eef1f6] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#3b4a63]/70">
          What the shadows suggest
        </p>
        <span className="text-[10px] uppercase tracking-wide text-[#3b4a63]/50">rough estimate</span>
      </div>

      <p className="text-sm text-[#2a1d10]">
        Tracing the shade across the year, this bed reads as{' '}
        <strong className="font-semibold">{TIER_LABEL[suggestion.tier]}</strong>.
      </p>

      <dl className="grid grid-cols-4 gap-1.5 text-center">
        {SEASONS.map((s) => (
          <div key={s} className="rounded-md bg-white/60 px-1 py-1.5">
            <dt className="text-[10px] uppercase tracking-wide text-[#3b4a63]/55">
              {SEASON_LABEL[s]}
            </dt>
            <dd className="text-sm font-medium text-[#2a1d10]">
              {formatHours(suggestion.sunHoursBySeason[s])}
            </dd>
          </div>
        ))}
      </dl>

      {statedYourself(statedTier, agrees)}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => onAccept(suggestion.tier)}
          className="rounded-md bg-[#3b4a63] px-3 py-1.5 text-sm text-white transition hover:bg-[#2f3c52]"
        >
          Use this label
        </button>
        <span className="text-xs text-[#2a1d10]/55">
          It&rsquo;s just a model — your own read of the yard always wins.
        </span>
      </div>
    </div>
  )
}

function statedYourself(statedTier: SunTier | undefined, agrees: boolean) {
  if (!statedTier) return null
  if (agrees) {
    return (
      <p className="text-xs text-[#2a1d10]/60">
        That matches the label you gave this bed — nice, the shade agrees with you.
      </p>
    )
  }
  return (
    <p className="text-xs text-[#2a1d10]/60">
      You labeled this one <strong>{TIER_LABEL[statedTier]}</strong>. If the shadows look
      off, trust your eyes — traced heights are only rough.
    </p>
  )
}

/** Human sun-hours: "≈ 6 hrs", singular-aware, "none" for a dark bed. */
function formatHours(hours: number): string {
  const rounded = Math.round(hours)
  if (rounded <= 0) return 'none'
  return `≈ ${rounded} hr${rounded === 1 ? '' : 's'}`
}
