import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Site inventory — sunshower',
  description:
    'Coming soon: a guided walkthrough of sun, soil, water, and exposure for a bare yard before planting.',
}

const PANEL =
  'rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 p-5 shadow-sm backdrop-blur-sm'

const TOPICS = [
  {
    title: 'Sun exposure',
    body: 'Map the parts of the yard that get full sun, part sun, and shade across a day. Native plant lists are sorted by sun requirement.',
  },
  {
    title: 'Soil basics',
    body: 'Drainage, texture, and pH shape what grows. A jar test and a simple drainage check tell you most of what you need.',
  },
  {
    title: 'Water access',
    body: 'Where does the hose reach? Does rain pool anywhere? Most CA natives want infrequent deep water, not frequent shallow.',
  },
  {
    title: 'Exposure',
    body: 'Wind, frost pockets, reflected heat from walls — micro-conditions that change which natives will thrive where.',
  },
]

export default function SiteInventoryPage() {
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
          <span className="hidden sm:inline">phase 2 · site inventory</span>
        </div>

        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-800/80">
            Pollinator Garden — Phase 2: Site inventory
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-[0.95] tracking-tight text-[#2a1d10] sm:text-5xl">
            A blank yard is
            <br />
            full of clues.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#2a1d10]/75 sm:text-base">
            Before plant selection, the right-plant-right-place call depends on
            knowing what your yard offers — sun, soil, water, exposure. A
            guided walkthrough is in progress; for now, here&rsquo;s the
            outline.
          </p>
        </header>

        <div className={PANEL + ' mb-6'}>
          <p className="text-xs uppercase tracking-[0.14em] text-amber-900/85">
            Coming soon
          </p>
          <p className="mt-2 text-sm text-[#2a1d10]/85">
            An interactive site-inventory walkthrough is on the backlog. Until
            then, the four buckets below are what to look at when you survey
            your yard.
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
          <Link
            href="/sunshower/cleanup-plan"
            className="rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/70 px-4 py-2 text-sm font-medium text-[#2a1d10] hover:bg-[#fff6df]"
          >
            Try the cleanup plan instead →
          </Link>
        </div>
      </div>
    </main>
  )
}
