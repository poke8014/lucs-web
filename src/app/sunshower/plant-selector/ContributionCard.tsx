// Contribution card — plant ↔ your eco-region. Renders Unit A's contribution()
// lines (ready-to-render human sentences, framed additively, never guilt math).
//
// SEAM (Unit C): C owns the nudge-ladder contribution copy — the 🟡
// non_native_safe honest-asymmetry variant and the fuller 🔴 cost framing, plus
// the copy pass against the philosophy section. This component is a thin,
// neutral renderer of contribution().lines today; C will branch on
// `card.tier` for the per-tier voice and, for 🔴, wire the cleanup-plan handoff
// link. Keep the data source (contribution()) and this file as the single seam.

import Link from 'next/link'
import { contribution } from './contribution'
import type { SelectorPlant } from './types'

export default function ContributionCard({ plant }: { plant: SelectorPlant }) {
  const card = contribution(plant)

  const heading =
    card.tier === 'invasive'
      ? 'What it costs the region'
      : card.tier === 'unknown'
        ? 'What it gives back'
        : 'What it gives back'

  return (
    <section className="rounded-lg border border-emerald-800/20 bg-emerald-800/5 p-4">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-900/80">
        {heading}
      </h3>
      <ul className="space-y-1.5 text-sm text-[#2a1d10]/85">
        {card.lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-0.5 flex-none text-emerald-800/60">
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {/* 🔴 handoff — the cost card links back to the removal planner.
          SEAM (Unit C): C refines this redirect copy + role-based stand-ins. */}
      {card.tier === 'invasive' && (
        <Link
          href="/sunshower/cleanup-plan"
          className="mt-3 inline-block text-sm font-medium text-red-900 underline underline-offset-4 hover:text-red-700"
        >
          Open the cleanup plan →
        </Link>
      )}
    </section>
  )
}
