'use client'

import { useState } from 'react'
import { defaultObstructionHeightFt, storyToHeightFt } from './baseMapMath'
import { SOUTH_BAY_LATITUDE_DEG, TIME_OF_DAY_HOUR } from './sun'

// Shade-timelapse help: how the estimate works and which inputs drive it.
//
// Rendered in two places — next to the timelapse (CheckStep) where the shadows
// appear, and under the obstruction list (BaseMapStep) where the inputs get
// filled out. One component so the explanation can't fork. All the numbers in
// the copy are read from the model's own constants (sun.ts / baseMapMath.ts),
// not typed in — if the model changes, the help changes with it.

const TREE_FT = defaultObstructionHeightFt('tree')
const FENCE_FT = defaultObstructionHeightFt('fence')
const STORY_1_FT = storyToHeightFt(1)
const STORY_2_FT = storyToHeightFt(2)

/** Format a 24h solar hour as a compact "9am" / "3pm" label. */
function hourLabel(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm'
  const clock = h % 12 === 0 ? 12 : h % 12
  return `${clock}${suffix}`
}

export default function ShadeHelp() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#2a1d10]/80 hover:text-[#2a1d10]"
      >
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#2a1d10]/40 text-[11px] font-semibold"
        >
          ?
        </span>
        How the shade estimate works
        <span aria-hidden className="ml-auto text-xs text-[#2a1d10]/50">
          {open ? 'hide' : 'show'}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[#2a1d10]/10 px-4 pb-4 pt-3 text-xs leading-relaxed text-[#2a1d10]/70">
          <p>
            The app computes where the sun sits over the South Bay (a fixed ~
            {SOUTH_BAY_LATITUDE_DEG}°N — your address is never used) on four
            representative days, one per season at the solstices and equinoxes,
            at {hourLabel(TIME_OF_DAY_HOUR.morning)},{' '}
            {hourLabel(TIME_OF_DAY_HOUR.midday)}, and{' '}
            {hourLabel(TIME_OF_DAY_HOUR.afternoon)} solar time. Each traced
            obstruction is then stretched away from the sun: shadow length is
            its height divided by the tangent of the sun&rsquo;s altitude, so
            the lower the sun — winter, early morning, late afternoon — the
            longer the shadow.
          </p>

          <div>
            <p className="mb-1 font-medium uppercase tracking-[0.12em] text-[#2a1d10]/55">
              What you fill out (Base map step)
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <strong>Outlines + heights.</strong> Trace the house, fences,
                and tree canopies, and give each a height — no height, no
                shadow. Rough guesses are fine: a 1-story house ≈ {STORY_1_FT}{' '}
                ft, 2-story ≈ {STORY_2_FT} ft, a privacy fence ≈ {FENCE_FT} ft,
                a yard tree canopy ≈ {TREE_FT} ft. Taller casts longer.
              </li>
              <li>
                <strong>The deciduous checkbox on trees.</strong> A deciduous
                tree is bare in winter (casts nothing) and thinning in fall
                (half strength) — often the difference between a bed reading
                &ldquo;full shade&rdquo; and &ldquo;winter sun.&rdquo;
              </li>
              <li>
                <strong>The north bearing.</strong> Shadows swing around your
                north arrow — if north points the wrong way on the map, every
                shadow falls the wrong way too.
              </li>
            </ul>
          </div>

          <p>
            It&rsquo;s a model, not truth — heights are estimates and the
            latitude is regional. Use it to get planting-plan close, and keep
            updating your sun labels from what you actually see in the yard.
          </p>
        </div>
      )}
    </div>
  )
}
