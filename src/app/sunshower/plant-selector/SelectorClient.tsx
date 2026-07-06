'use client'

// Selector client shell. Owns:
//   • profile hydration (read-only, via the existing useSiteProfile hook)
//   • active zone / palette-lens / facet state
//   • the browse pipeline: natives → lens → facets → rank → group by role →
//     per-section reroll windows
//   • search
//   • the ?plant=<slug> deep-linkable drawer (open on load, URL synced on
//     open/close without full navigation — mirrors site-inventory's ?step= via
//     Suspense + useSearchParams so `next build` (SSG) stays happy)

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { useSiteProfile } from '../site-inventory/useSiteProfile'
import { inArchetypeLens } from './archetype'
import BatchSection from './BatchSection'
import { nativePlants, plantBySlug } from './corpus'
import { applyFacets, type FacetKey } from './facets'
import FacetBar from './FacetBar'
import LensHeader from './LensHeader'
import PlantDrawer from './PlantDrawer'
import { groupByRole, rankForBrowse } from './ranking'
import SelectorSearch from './SelectorSearch'
import type { SelectorPlant } from './types'

export default function SelectorClient() {
  return (
    <Suspense fallback={null}>
      <SelectorInner />
    </Suspense>
  )
}

function SelectorInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plantParam = searchParams.get('plant')

  const { profile: rawProfile, hydrated } = useSiteProfile()
  // The selector treats "no meaningful profile" as no profile: an empty
  // walkthrough (never started) shouldn't render the with-profile UI. We gate
  // on hydration so SSR/first-paint agree (both null), then use the profile
  // only if it carries the signals the lens/fit read on.
  const profile = useMemo(() => {
    if (!hydrated) return null
    const hasSignal =
      rawProfile.sunZones.length > 0 || rawProfile.archetype != null
    return hasSignal ? rawProfile : null
  }, [hydrated, rawProfile])

  // Active zone — defaults to the first zone.
  const [zoneOverride, setZoneOverride] = useState<string | undefined>(undefined)
  const activeZoneId = zoneOverride ?? profile?.sunZones[0]?.id

  // Palette lens — empty means "all communities" (no filter). Toggling a chip
  // narrows to the chips the user leaves on; "All communities" clears.
  const [activeCommunities, setActiveCommunities] = useState<string[]>([])
  const toggleCommunity = useCallback((community: string) => {
    setActiveCommunities((prev) => {
      // First narrowing tap from the default (all) lands on just that chip.
      if (prev.length === 0) return [community]
      return prev.includes(community)
        ? prev.filter((c) => c !== community)
        : [...prev, community]
    })
  }, [])
  const showAllCommunities = useCallback(() => setActiveCommunities([]), [])

  // Facets + bloom seasons.
  const [activeFacets, setActiveFacets] = useState<FacetKey[]>([])
  const [activeSeasons, setActiveSeasons] = useState<string[]>([])
  const toggleFacet = useCallback((facet: FacetKey) => {
    setActiveFacets((prev) =>
      prev.includes(facet) ? prev.filter((f) => f !== facet) : [...prev, facet],
    )
  }, [])
  const toggleSeason = useCallback((season: string) => {
    setActiveSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season],
    )
  }, [])

  // Per-section reroll window indices, keyed by role.
  const [windows, setWindows] = useState<Record<string, number>>({})
  const reroll = useCallback((role: string) => {
    setWindows((prev) => ({ ...prev, [role]: (prev[role] ?? 0) + 1 }))
  }, [])

  // ── The browse pipeline ──────────────────────────────────────────────────
  // natives → archetype/community lens → facets → rank → group by role.
  const grouped = useMemo(() => {
    let pool = nativePlants()

    // Palette lens: explicit chip selection wins; otherwise the archetype's
    // default lens (a default, never a wall — chips can widen to all).
    if (activeCommunities.length > 0) {
      pool = pool.filter((p) =>
        (p.native?.communities_simplified ?? []).some((c) =>
          activeCommunities.includes(c),
        ),
      )
    } else if (profile?.archetype?.value) {
      const archetype = profile.archetype.value
      pool = pool.filter((p) => inArchetypeLens(p, archetype))
    }

    pool = applyFacets(pool, activeFacets, activeSeasons)
    const ranked = rankForBrowse(pool, profile, activeZoneId)
    return groupByRole(ranked)
  }, [activeCommunities, activeFacets, activeSeasons, profile, activeZoneId])

  // ── Deep link ────────────────────────────────────────────────────────────
  const activePlant: SelectorPlant | undefined = plantParam
    ? plantBySlug(plantParam)
    : undefined

  const openPlant = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('plant', slug)
      router.replace(`/sunshower/plant-selector?${params.toString()}`, {
        scroll: false,
      })
    },
    [router, searchParams],
  )

  const closePlant = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('plant')
    const qs = params.toString()
    router.replace(`/sunshower/plant-selector${qs ? `?${qs}` : ''}`, {
      scroll: false,
    })
  }, [router, searchParams])

  const nothingInLens = grouped.length === 0

  return (
    <main className="pointer-events-auto absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-6 pb-24 sm:py-10">
        <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#2a1d10]/70">
          <Link
            href="/sunshower"
            className="hover:text-[#2a1d10] hover:underline underline-offset-4"
          >
            ← sunshower
          </Link>
          <span className="hidden sm:inline">phase 2 · selection</span>
        </div>

        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-800/80">
            Pollinator Garden — Phase 2: Selection
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-[0.95] tracking-tight text-[#2a1d10] sm:text-5xl">
            The plants that
            <br />
            belong where you live.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#2a1d10]/75 sm:text-base">
            Native plants verified growing wild within ~10 miles of San Jose,
            in small batches instead of one long list. Look up anything
            you&rsquo;re curious about and get an honest read on how it fits your
            yard and what it gives the local food web.
          </p>
        </header>

        {/* Search — the full corpus, tier-badged before tap. */}
        <div className="mb-6">
          <SelectorSearch onSelect={openPlant} />
        </div>

        {/* Lens header — sticky so the active zone/lens stays reachable. */}
        <div className="sticky top-0 z-10 -mx-6 mb-4 bg-[#f7e9c9]/85 px-6 py-2 backdrop-blur-sm">
          <LensHeader
            profile={profile}
            activeZoneId={activeZoneId}
            onZoneChange={setZoneOverride}
            activeCommunities={activeCommunities}
            onToggleCommunity={toggleCommunity}
            onShowAll={showAllCommunities}
          />
        </div>

        {/* Facet toggles. */}
        <div className="mb-6">
          <FacetBar
            activeFacets={activeFacets}
            onToggleFacet={toggleFacet}
            activeSeasons={activeSeasons}
            onToggleSeason={toggleSeason}
          />
        </div>

        {/* Role batches. */}
        {nothingInLens ? (
          <p className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/70 p-5 text-sm text-[#2a1d10]/75">
            No plants match those filters right now. Try loosening a facet or
            widening the palette lens to all communities.
          </p>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ role, plants }) => (
              <BatchSection
                key={role}
                role={role}
                ranked={plants}
                windowIndex={windows[role] ?? 0}
                onReroll={() => reroll(role)}
                profile={profile}
                activeZoneId={activeZoneId}
                onOpen={openPlant}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer — deep-linkable via ?plant=. */}
      {activePlant && (
        <PlantDrawer
          plant={activePlant}
          profile={profile}
          activeZoneId={activeZoneId}
          onZoneChange={setZoneOverride}
          onOpen={openPlant}
          onClose={closePlant}
        />
      )}
    </main>
  )
}
