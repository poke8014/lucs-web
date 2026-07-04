import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Care — sunshower',
  description:
    'Coming soon: ongoing care for an established native pollinator garden — watering, pruning, composting, seasonal rhythms.',
}

const PANEL =
  'rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-5 shadow-sm backdrop-blur-sm'

const TOPICS = [
  {
    title: 'Watering',
    body: 'Most established natives want infrequent deep water — once every 2-4 weeks in dry months, less if at all once roots are settled. Frequent shallow watering selects for shallow-rooted invasives.',
  },
  {
    title: 'Pruning',
    body: 'Timing varies by plant: deadheading after bloom for many perennials, structural pruning of shrubs in late winter, no pruning during nesting/active growth for some.',
  },
  {
    title: 'Composting & mulch',
    body: 'Native plants in well-mulched beds rarely need amendments. A 2-3" wood-chip layer suppresses weeds, holds moisture, and feeds soil biology slowly.',
  },
  {
    title: 'Seasonal rhythm',
    body: 'CA natives often go summer-dormant — yellowing leaves and slowed growth in July-August is healthy. The growth window is fall through spring.',
  },
]

export default function CarePage() {
  return (
    <main className="pointer-events-auto absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#2a1d10]/70">
          <Link
            href="/sunshower"
            className="hover:text-[#2a1d10] hover:underline underline-offset-4"
          >
            ← sunshower
          </Link>
          <span className="hidden sm:inline">phase 4 · care</span>
        </div>

        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-800/80">
            Pollinator Garden — Phase 4: Care
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-[0.95] tracking-tight text-[#2a1d10] sm:text-5xl">
            Keep the garden
            <br />
            doing its work.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#2a1d10]/75 sm:text-base">
            An established native planting needs less than a typical
            ornamental garden, but not nothing. Detailed care guidance is in
            progress; here&rsquo;s the outline of what matters.
          </p>
        </header>

        <div className={PANEL + ' mb-6'}>
          <p className="text-xs uppercase tracking-[0.14em] text-amber-900/85">
            Coming soon
          </p>
          <p className="mt-2 text-sm text-[#2a1d10]/85">
            Per-plant care notes and a seasonal calendar are on the backlog.
            For now, the four areas below are what to attend to.
          </p>
        </div>

        <ul className="space-y-4">
          {TOPICS.map((t) => (
            <li key={t.title} className={PANEL}>
              <h2 className="font-serif text-xl text-[#2a1d10]">{t.title}</h2>
              <p className="mt-2 text-sm text-[#2a1d10]/80">{t.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/sunshower"
            className="text-sm text-[#2a1d10]/70 hover:text-[#2a1d10]"
          >
            ← back to sunshower
          </Link>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sunshower/site-inventory"
              className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/70 px-4 py-2 text-sm font-medium text-[#2a1d10] hover:bg-[#fff6df]"
            >
              Map what your yard offers →
            </Link>
            <Link
              href="/sunshower/cleanup-plan"
              className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/70 px-4 py-2 text-sm font-medium text-[#2a1d10] hover:bg-[#fff6df]"
            >
              Spot-cleanup unwanted plants →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
