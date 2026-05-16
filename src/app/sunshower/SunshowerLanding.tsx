'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Scene from './Scene'
import YardStateRouter from './YardStateRouter'

// A `md:hidden` subtree is display:none but still mounted, so without this
// gate the mobile stage <Scene> would spin up a second WebGL canvas on
// desktop (alongside the backdrop). Only mount the stage when actually narrow.
// The 768px switch is intentionally above the width where the desktop
// backdrop's off-center shovel would start clipping, so there's no band
// where the shovel is unreachable before the mobile layout takes over.
function useIsNarrow() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return narrow
}

function Header() {
  return (
    <header className="flex items-start justify-between text-xs uppercase tracking-[0.18em] text-[#2a1d10]/70">
      <span>sunshower</span>
      <span className="hidden lg:inline">santa clara county · zone 9b</span>
    </header>
  )
}

function Intro() {
  return (
    <>
      {/* Fluid type — scales continuously with viewport width so it
          doesn't snap when the layout switches at the md breakpoint. */}
      <h1 className="font-serif leading-[0.95] tracking-tight text-[clamp(2.75rem,7vw,4.5rem)]">
        a garden,
        <br />
        in progress.
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-[#2a1d10]/80 text-[clamp(0.875rem,1.6vw,1rem)]">
        Native California plants, the pollinators that co-evolved with them,
        and the slow work of pulling weeds before the rains come.
      </p>
    </>
  )
}

export default function SunshowerLanding() {
  const narrow = useIsNarrow()
  return (
    <>
      {/* DESKTOP — immersive overlay above the fixed 3D backdrop (from
          layout). pointer-events-none so the 3D shovel stays clickable;
          interactive children re-enable pointer events. */}
      <div className="pointer-events-none absolute inset-0 hidden flex-col p-6 md:flex lg:p-10">
        <Header />
        <div className="flex flex-1 flex-col justify-center">
          <div className="max-w-xl">
            <Intro />
            <YardStateRouter />
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-[#2a1d10]/55">
              or pick up the shovel below →
            </p>
            <Link
              href="/sunshower/cleanup-plan"
              className="pointer-events-auto sr-only focus:not-sr-only focus:mt-3 focus:inline-block focus:rounded focus:bg-[#2a1d10] focus:px-3 focus:py-1.5 focus:text-sm focus:text-[#f7e9c9]"
            >
              Skip to cleanup plan
            </Link>
          </div>
        </div>
      </div>

      {/* MOBILE — a natural-height scroll document. Hero + dropdown first,
          then the real 3D shovel as an in-flow stage you scroll down to. */}
      <div className="flex flex-col md:hidden">
        {/* First screen mirrors the desktop layout — same padding, same
            centered hero, AND the same ambient 3D scene behind it (sun /
            rain / ground, no shovel) — so crossing the md breakpoint
            barely moves anything and the atmosphere stays continuous. */}
        <div className="relative min-h-[100svh]">
          <div className="pointer-events-none absolute inset-0">
            {narrow && <Scene variant="backdrop" />}
          </div>
          <div className="relative z-10 flex min-h-[100svh] flex-col p-6">
            <Header />
            <div className="flex flex-1 flex-col justify-center">
              <div className="max-w-xl">
                <Intro />
                <YardStateRouter />
                <p className="mt-8 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#2a1d10]/55">
                  pick up the shovel — scroll down
                  <span aria-hidden>↓</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The 3D shovel lives here, below the dropdown. Tall enough that
            the user scrolls down a little to see the full shovel, then
            taps it to open the cleanup plan. */}
        <div className="relative h-[88svh] w-full">
          {narrow && <Scene variant="stage" />}
        </div>
      </div>
    </>
  )
}
