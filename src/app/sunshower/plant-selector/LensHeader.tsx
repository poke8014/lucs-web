'use client'

// Lens header — the palette lens over the browse surface.
//   • With a profile: an active-zone picker ("choosing for: <zone>") over
//     profile.sunZones, plus archetype-derived community chips (from Unit A's
//     lensCommunities). Chips are toggleable; the lens is a default, never a
//     wall — a "show all communities" affordance widens to the full palette.
//   • Without a profile: "all of San Jose's palette" framing + a friendly
//     walkthrough invitation (link, never a gate).

import Link from 'next/link'
import type { SiteProfile, SunZone } from '../site-inventory/types'
import { lensCommunities } from './archetype'

export default function LensHeader({
  profile,
  activeZoneId,
  onZoneChange,
  activeCommunities,
  onToggleCommunity,
  onShowAll,
}: {
  profile: SiteProfile | null
  activeZoneId: string | undefined
  onZoneChange: (zoneId: string) => void
  activeCommunities: string[] // empty = all communities (no lens filter)
  onToggleCommunity: (community: string) => void
  onShowAll: () => void
}) {
  if (!profile) {
    return (
      <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/80 p-4 backdrop-blur-sm">
        <p className="font-serif text-lg text-[#2a1d10]">
          Browsing all of San Jose&rsquo;s native palette.
        </p>
        <p className="mt-1 text-sm text-[#2a1d10]/75">
          Every plant here grows wild within ~10 miles.{' '}
          <Link
            href="/sunshower/site-inventory"
            className="font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-700"
          >
            Map your yard
          </Link>{' '}
          and we&rsquo;ll rank them for your light, soil, and water — and unlock
          the palette that matches your yard&rsquo;s bones.
        </p>
      </div>
    )
  }

  const zones: SunZone[] = profile.sunZones
  const archetype = profile.archetype?.value
  const lens = archetype ? lensCommunities(archetype) : []
  const allActive = activeCommunities.length === 0

  return (
    <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/80 p-4 backdrop-blur-sm">
      {zones.length > 0 && (
        <div className="mb-3">
          <label className="block text-xs uppercase tracking-[0.12em] text-[#2a1d10]/60">
            Choosing for
          </label>
          {zones.length === 1 ? (
            <p className="mt-1 font-serif text-lg text-[#2a1d10]">
              {zones[0].label}
            </p>
          ) : (
            <select
              value={activeZoneId ?? zones[0]?.id ?? ''}
              onChange={(e) => onZoneChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#2a1d10]/25 bg-[#fff6df]/90 px-3 py-2 text-sm text-[#2a1d10] focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 sm:max-w-xs"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {lens.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-[0.12em] text-[#2a1d10]/60">
            Palette lens
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lens.map((community) => {
              const on = allActive || activeCommunities.includes(community)
              return (
                <button
                  key={community}
                  type="button"
                  onClick={() => onToggleCommunity(community)}
                  aria-pressed={on}
                  className={
                    'rounded-full border px-3 py-1 text-sm transition ' +
                    (on
                      ? 'border-emerald-800 bg-emerald-800/10 text-emerald-900'
                      : 'border-[#2a1d10]/25 bg-[#fff6df]/70 text-[#2a1d10]/60 hover:border-[#2a1d10]/50')
                  }
                >
                  {community}
                </button>
              )
            })}
            <button
              type="button"
              onClick={onShowAll}
              aria-pressed={allActive}
              className={
                'rounded-full border px-3 py-1 text-sm transition ' +
                (allActive
                  ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                  : 'border-[#2a1d10]/25 bg-[#fff6df]/70 text-[#2a1d10]/70 hover:border-[#2a1d10]/50')
              }
            >
              All communities
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
