// Contribution card — plant ↔ your eco-region. Renders contribution()'s
// per-tier read (Unit A/C pure function): 🟢 the additive "what it gives back"
// star, 🟡 the honest-asymmetry good-neighbor read, 🔴 "what it costs the
// region" with a warm cleanup handoff, unknown said plainly with no fabrication.
//
// The component only styles + arranges what contribution() decides to say — the
// copy lives there so it stays testable and answers to one review question
// (spec §philosophy): "would this make someone feel bad about a plant they
// love?" No urgency language outside 🔴; no red styling on 🟡 (§Anti-goals).

import Link from 'next/link'
import { contribution } from './contribution'
import type { SelectorPlant } from './types'

// Cal-IPC rating → plain label, matching the cleanup-plan vocabulary so the two
// surfaces read consistently when a user crosses between them.
const RATING_LABEL: Record<string, string> = {
  high: 'Cal-IPC High',
  moderate: 'Cal-IPC Moderate',
  limited: 'Cal-IPC Limited',
  watch: 'Cal-IPC Watch',
  alert: 'Cal-IPC Alert',
}

export default function ContributionCard({ plant }: { plant: SelectorPlant }) {
  const card = contribution(plant)
  const isCost = card.tier === 'invasive'

  const heading = isCost ? 'What it costs the region' : 'What it gives back'

  // 🔴 gets a red-toned panel (firm); every other tier keeps the warm emerald
  // "gives back" panel — including 🟡, which must never look like a warning.
  const panelClass = isCost
    ? 'rounded-lg border border-red-300 bg-red-50 p-4'
    : 'rounded-lg border border-emerald-800/20 bg-emerald-800/5 p-4'
  const headingClass = isCost
    ? 'mb-2 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-red-900/80'
    : 'mb-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-900/80'
  const bulletClass = isCost ? 'mt-0.5 flex-none text-red-800/50' : 'mt-0.5 flex-none text-emerald-800/60'

  return (
    <section className={panelClass}>
      <h3 className={headingClass}>
        <span>{heading}</span>
        {isCost && card.calIpcRating && RATING_LABEL[card.calIpcRating] && (
          <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.65rem] font-medium normal-case tracking-normal text-red-900">
            {RATING_LABEL[card.calIpcRating]}
          </span>
        )}
      </h3>

      <ul className="space-y-1.5 text-sm text-[#2a1d10]/85">
        {card.lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className={bulletClass}>
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {/* 🔴 warm handoff — not a scold, an offer of help. The cleanup planner is
          framed as a tool for *if* it's in your yard, on your terms. */}
      {card.offersCleanupHandoff && (
        <p className="mt-3 text-sm text-[#2a1d10]/80">
          If it’s in your yard, the{' '}
          <Link
            href="/sunshower/cleanup-plan"
            className="font-medium text-red-900 underline underline-offset-4 hover:text-red-700"
          >
            cleanup planner
          </Link>{' '}
          can help you plan its exit — no rush, whenever you’re ready.
        </p>
      )}
    </section>
  )
}
