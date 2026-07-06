'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { routeForYardState } from './yardState'

const PHRASES = [
  'overgrown with weeds…',
  'mostly bare dirt…',
  'partially planted, needs help…',
  'established, just want to care for it…',
]

type Option = {
  label: string
  next: string
  href: string
}

const OPTIONS: Option[] = [
  { label: 'Overgrown with weeds', next: 'Build a removal plan', href: routeForYardState('overgrown') },
  { label: 'Mostly bare dirt', next: 'Site inventory', href: routeForYardState('bare') },
  { label: 'Partially planted, needs help', next: 'Selective cleanup', href: routeForYardState('partial') },
  { label: 'Established, just want to care for it', next: 'Ongoing care', href: routeForYardState('established') },
  { label: 'Ready to pick plants', next: 'Plant selector', href: '/sunshower/plant-selector' },
]

const PHASE_IN_MS = 2150
const PHASE_OUT_MS = 350

export default function YardStateRouter() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  const [listMaxH, setListMaxH] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open) return
    const wait = phase === 'in' ? PHASE_IN_MS : PHASE_OUT_MS
    const t = setTimeout(() => {
      if (phase === 'in') {
        setPhase('out')
      } else {
        setIdx((i) => (i + 1) % PHRASES.length)
        setPhase('in')
      }
    }, wait)
    return () => clearTimeout(t)
  }, [open, phase, idx])

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Cap the open list to the space left below it so it never runs past the
  // viewport edge; overflow scrolls internally. Recompute on resize/scroll
  // (the mobile layout scrolls, which shifts the button underneath the list).
  useEffect(() => {
    if (!open) return
    const MARGIN = 16 // breathing room so the last row isn't flush to the edge
    function measure() {
      const el = listRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      setListMaxH(Math.max(140, window.innerHeight - top - MARGIN))
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open])

  function choose(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <div ref={rootRef} className="pointer-events-auto mt-6 max-w-md">
      <p
        id="yard-state-label"
        className="font-serif text-2xl leading-tight text-[#2a1d10] sm:text-3xl"
      >
        How&rsquo;s your yard looking today?
      </p>
      <div className="relative mt-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby="yard-state-label"
          className="flex w-full items-center justify-between gap-3 rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/90 px-3 py-2.5 text-left text-base text-[#2a1d10] shadow-sm backdrop-blur-sm hover:border-[#2a1d10]/50 focus:border-[#2a1d10] focus:outline-none"
        >
          <span className="relative block min-h-[1.5rem] flex-1 overflow-hidden">
            <span
              aria-hidden
              className={
                'block truncate text-[#2a1d10]/55 transition-opacity duration-300 ' +
                (!open && phase === 'in' ? 'opacity-100' : 'opacity-0')
              }
            >
              {PHRASES[idx]}
            </span>
          </span>
          <span
            aria-hidden
            className={
              'flex-none text-[#2a1d10]/55 transition-transform ' +
              (open ? 'rotate-180' : '')
            }
          >
            ▾
          </span>
        </button>

        {open && (
          <ul
            ref={listRef}
            role="listbox"
            aria-labelledby="yard-state-label"
            style={listMaxH != null ? { maxHeight: listMaxH } : undefined}
            className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[60vh] overflow-y-auto overscroll-contain rounded-md border border-[#2a1d10]/20 bg-[#fff6df] shadow-lg"
          >
            {OPTIONS.map((opt) => (
              <li key={opt.href}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose(opt.href)}
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#2a1d10]/5 focus:bg-[#2a1d10]/5 focus:outline-none"
                >
                  <span className="text-sm text-[#2a1d10]">{opt.label}</span>
                  <span className="flex-none text-xs uppercase tracking-[0.14em] text-[#2a1d10]/55">
                    {opt.next} →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-xs text-[#2a1d10]/60">
        Pick the one that feels closest — you can always come back.
      </p>
    </div>
  )
}
