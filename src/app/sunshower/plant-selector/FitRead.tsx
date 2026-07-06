// Fit read — plant ↔ your site. Renders fitForZone() level + reason sentences
// for the active zone, with an inline zone switcher. The no-profile 'unknown'
// state renders the walkthrough invitation (a link, never a gate).

import Link from 'next/link'
import type { SiteProfile, SunZone } from '../site-inventory/types'
import { fitForZone } from './fit'
import type { FitLevel, SelectorPlant } from './types'

const LEVEL_STYLE: Record<FitLevel, { label: string; className: string }> = {
  great: { label: 'Great fit', className: 'border-emerald-800/40 bg-emerald-800/10 text-emerald-900' },
  good: { label: 'Good fit', className: 'border-emerald-800/30 bg-emerald-800/5 text-emerald-900/90' },
  stretch: { label: 'A stretch', className: 'border-amber-700/40 bg-amber-100/70 text-amber-900' },
  mismatch: { label: 'Fights this spot', className: 'border-orange-400/50 bg-orange-100/70 text-orange-900' },
  unknown: { label: 'Fit unknown', className: 'border-[#2a1d10]/25 bg-[#fff6df]/80 text-[#2a1d10]/70' },
}

export default function FitRead({
  plant,
  profile,
  activeZoneId,
  onZoneChange,
}: {
  plant: SelectorPlant
  profile: SiteProfile | null
  activeZoneId: string | undefined
  onZoneChange: (zoneId: string) => void
}) {
  const fit = fitForZone(plant, activeZoneId, profile)
  const style = LEVEL_STYLE[fit.level]
  const zones: SunZone[] = profile?.sunZones ?? []
  const activeZone = zones.find((z) => z.id === activeZoneId) ?? zones[0]

  return (
    <section className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/70 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg text-[#2a1d10]">How it fits your yard</h3>
        <span
          className={
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ' +
            style.className
          }
        >
          {style.label}
        </span>
      </div>

      {/* Inline zone switcher — only when the profile has more than one zone. */}
      {profile && zones.length > 1 && (
        <div className="mb-3">
          <label className="block text-xs uppercase tracking-[0.12em] text-[#2a1d10]/60">
            Choosing for
          </label>
          <select
            value={activeZone?.id ?? ''}
            onChange={(e) => onZoneChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/90 px-3 py-2 text-sm text-[#2a1d10] focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <ul className="space-y-1.5 text-sm text-[#2a1d10]/85">
        {fit.reasons.map((reason, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-0.5 flex-none text-[#2a1d10]/40">
              ·
            </span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      {/* No profile → the walkthrough invitation (link, never a gate). */}
      {!profile && (
        <Link
          href="/sunshower/site-inventory"
          className="mt-3 inline-block text-sm font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-700"
        >
          Do the quick yard walkthrough →
        </Link>
      )}
    </section>
  )
}
