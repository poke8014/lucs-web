// Tier badge — the 🟢/🟡/🔴/unknown read on a plant, shown before tap in search
// and on every card/drawer. One place for the nudge-ladder tone contract.
//
// Copy contract (spec §"The nudge ladder", owned by Unit C): each badge's tone
// is deliberate. 🟢 celebrates ("Native here"), 🟡 respects ("Good neighbor" —
// no red badge on a good neighbor, per §Anti-goals), 🔴 is firm but kind
// ("Invasive here", never "banned"/"forbidden"), unknown is honest ("Not in our
// book yet"). The review question for every label: would this make someone feel
// bad about a plant they love? Only 🔴 names a problem, and it names the plant's
// behavior, not the gardener.

import type { SelectorPlant } from './types'

export type Tier = 'native' | 'non_native_safe' | 'invasive' | 'unknown'

// A plant's tier for badge purposes: nativity, with the 'native-but-no-block'
// case (poison-oak) treated as unknown since we can't do a native read on it.
export function tierOf(plant: SelectorPlant): Tier {
  if (plant.nativity === 'native' && plant.native) return 'native'
  if (plant.nativity === 'non_native_safe') return 'non_native_safe'
  if (plant.nativity === 'invasive') return 'invasive'
  return 'unknown'
}

interface Variant {
  dot: string
  label: string
  className: string
}

// The three approved labels (spec §Search) + the deferred 🟡 rung.
const VARIANTS: Record<Tier, Variant> = {
  native: {
    dot: '🟢',
    label: 'Native here',
    className: 'border-emerald-800/40 bg-emerald-800/10 text-emerald-900',
  },
  non_native_safe: {
    dot: '🟡',
    label: 'Good neighbor',
    className: 'border-amber-700/40 bg-amber-100/70 text-amber-900',
  },
  invasive: {
    dot: '🔴',
    label: 'Invasive here',
    className: 'border-red-300 bg-red-100 text-red-900',
  },
  unknown: {
    dot: '·',
    label: 'Not in our book yet',
    className: 'border-[#2a1d10]/25 bg-[#fff6df]/80 text-[#2a1d10]/70',
  },
}

export function tierLabel(tier: Tier): string {
  return VARIANTS[tier].label
}

export default function TierBadge({
  tier,
  size = 'sm',
}: {
  tier: Tier
  size?: 'sm' | 'xs'
}) {
  const v = VARIANTS[tier]
  const pad = size === 'xs' ? 'px-2 py-0.5 text-[0.7rem]' : 'px-2.5 py-0.5 text-xs'
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border font-medium ' +
        pad +
        ' ' +
        v.className
      }
    >
      <span aria-hidden>{v.dot}</span>
      {v.label}
    </span>
  )
}
