'use client'

// My plant list — the "saved palette" surface.
// Grouped by zone → status; per-zone fit summary; garden-wide contribution
// rollup (the `already_have` payoff). No export UI (the list is the Phase-3
// handoff). Empty state: friendly invitation to browse/add.
//
// Mount point: SelectorClient mounts this as a collapsible section below the
// lens header but above the browse batches, so it's always reachable.

import { useState } from 'react'
import { useSiteProfile } from '../site-inventory/useSiteProfile'
import { nativePlants, plantBySlug } from './corpus'
import { fitForZone } from './fit'
import type { FitLevel, SelectorPlant } from './types'
import { usePlantList } from './usePlantList'
import type { PlantListEntry, PlantListStatus } from './plantList'
import { entriesByZone } from './plantList'
import { contributionRollup } from './rollup'

// ── Sub-types ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<PlantListStatus, string> = {
  considering: 'Considering',
  chosen: 'Chosen',
  already_have: 'Already growing',
}

const STATUS_COLOR: Record<PlantListStatus, string> = {
  considering: 'bg-stone-100 text-stone-700 border-stone-300',
  chosen: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  already_have: 'bg-amber-100 text-amber-900 border-amber-300',
}

const FIT_LABEL: Record<FitLevel, string> = {
  great: 'great fit',
  good: 'good fit',
  stretch: 'stretch',
  mismatch: 'mismatch',
  unknown: 'unknown',
}

// ── Per-zone fit summary in words (not numbers-theater) ───────────────────────

function zoneFitSummary(
  entries: PlantListEntry[],
  zoneId: string | undefined,
  profile: Parameters<typeof fitForZone>[2],
): string {
  const plants = entries
    .map((e) => plantBySlug(e.plantSlug))
    .filter((p): p is SelectorPlant => p?.native != null)

  if (plants.length === 0) return ''

  const counts: Record<FitLevel, number> = {
    great: 0,
    good: 0,
    stretch: 0,
    mismatch: 0,
    unknown: 0,
  }
  for (const p of plants) {
    const { level } = fitForZone(p, zoneId, profile)
    counts[level]++
  }

  const parts: string[] = []
  if (counts.great > 0) parts.push(`${counts.great} great fit${counts.great > 1 ? 's' : ''}`)
  if (counts.good > 0) parts.push(`${counts.good} good fit${counts.good > 1 ? 's' : ''}`)
  if (counts.stretch > 0) parts.push(`${counts.stretch} stretch${counts.stretch > 1 ? 'es' : ''}`)
  if (counts.mismatch > 0) parts.push(`${counts.mismatch} mismatch${counts.mismatch > 1 ? 'es' : ''}`)

  return parts.length > 0 ? parts.join(', ') : ''
}

// ── Entry row ─────────────────────────────────────────────────────────────────

function PlantRow({
  entry,
  onOpen,
}: {
  entry: PlantListEntry
  onOpen: (slug: string) => void
}) {
  const plant = plantBySlug(entry.plantSlug)
  if (!plant) return null

  const name = plant.common_names[0] ?? plant.scientific_name

  return (
    <li className="flex items-baseline justify-between gap-3 border-t border-[#2a1d10]/8 py-2 first:border-t-0">
      <button
        type="button"
        onClick={() => onOpen(entry.plantSlug)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="text-sm text-[#2a1d10] hover:underline underline-offset-4">
          {name}
        </span>
        {plant.common_names[0] && (
          <span className="ml-1.5 font-serif text-xs italic text-[#2a1d10]/55">
            {plant.scientific_name}
          </span>
        )}
      </button>
      <span
        className={[
          'flex-none rounded-full border px-2 py-0.5 text-xs',
          STATUS_COLOR[entry.status],
        ].join(' ')}
      >
        {STATUS_LABEL[entry.status]}
      </span>
    </li>
  )
}

// ── Zone section ──────────────────────────────────────────────────────────────

function ZoneGroup({
  zoneLabel,
  zoneId,
  entries,
  profile,
  onOpen,
}: {
  zoneLabel: string
  zoneId: string | undefined
  entries: PlantListEntry[]
  profile: Parameters<typeof fitForZone>[2]
  onOpen: (slug: string) => void
}) {
  const fitSummary =
    profile && zoneId ? zoneFitSummary(entries, zoneId, profile) : ''

  return (
    <div className="rounded-lg border border-[#2a1d10]/12 bg-[#fff6df]/60 p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-serif text-base text-[#2a1d10]">{zoneLabel}</h4>
        {fitSummary && (
          <span className="text-xs text-[#2a1d10]/55">{fitSummary}</span>
        )}
      </div>
      <ul>
        {entries.map((entry) => (
          <PlantRow key={entry.id} entry={entry} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  )
}

// ── Contribution rollup panel ─────────────────────────────────────────────────

function RollupPanel({ entries }: { entries: PlantListEntry[] }) {
  const corpus = nativePlants()
  const rollup = contributionRollup(entries, corpus)

  const hasChosenOrHave = rollup.alreadyHaveCount > 0 || rollup.totalHostSpecies > 0

  if (!hasChosenOrHave && rollup.wildlifeGuilds.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-emerald-700/20 bg-emerald-50/70 p-4 text-sm text-[#2a1d10]/85">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-900/70">
        What this palette gives back
      </p>
      {rollup.lines.length > 0 ? (
        <ul className="space-y-1.5">
          {rollup.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[#2a1d10]/60">
          Add a few chosen or already-growing plants to see your garden&rsquo;s
          contribution.
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlantListView({
  onOpen,
}: {
  /** Open the plant detail drawer for a given slug. */
  onOpen: (slug: string) => void
}) {
  const { list, hydrated } = usePlantList()
  const { profile, hydrated: profileHydrated } = useSiteProfile()
  const [collapsed, setCollapsed] = useState(false)

  const ready = hydrated && profileHydrated
  const totalEntries = list.entries.length

  // Group entries by zone; null key = "anywhere in the yard"
  const byZone = entriesByZone(list)

  // Build the zone-label map from profile zones (keyed by zone id)
  const zoneLabelMap = new Map(
    (profile.sunZones ?? []).map((z) => [z.id, z.label]),
  )

  // Collect zone ids in a stable order: profiled zones first (in profile order),
  // then any orphan zone ids not in the profile, then null last.
  const profiledZoneIds = (profile.sunZones ?? []).map((z) => z.id)
  const allKeys = [...byZone.keys()]
  const orphanZoneIds = allKeys.filter(
    (k) => k !== null && !profiledZoneIds.includes(k),
  )
  const orderedZoneKeys: (string | null)[] = [
    ...profiledZoneIds.filter((id) => byZone.has(id)),
    ...orphanZoneIds,
    ...(byZone.has(null) ? [null] : []),
  ]

  return (
    <section
      className="rounded-lg border border-[#2a1d10]/15 bg-[#f7e9c9]/70 shadow-sm backdrop-blur-sm"
      aria-label="My plant list"
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={!collapsed}
      >
        <span className="flex items-baseline gap-2">
          <span className="font-serif text-lg text-[#2a1d10]">My plant list</span>
          {ready && totalEntries > 0 && (
            <span className="text-sm text-[#2a1d10]/55">
              {totalEntries} {totalEntries === 1 ? 'plant' : 'plants'}
            </span>
          )}
        </span>
        <span
          aria-hidden
          className={[
            'flex-none text-[#2a1d10]/50 transition-transform',
            collapsed ? '' : 'rotate-180',
          ].join(' ')}
        >
          ▾
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-4 px-5 pb-5">
          {/* Not yet loaded — skeleton avoidance: just wait */}
          {!ready && (
            <p className="text-sm text-[#2a1d10]/50">Loading your list&hellip;</p>
          )}

          {/* Empty state */}
          {ready && totalEntries === 0 && (
            <div className="rounded-lg border border-dashed border-[#2a1d10]/20 px-4 py-6 text-center text-sm text-[#2a1d10]/60">
              <p>No plants saved yet.</p>
              <p className="mt-1">
                Open any plant and tap <em>Considering</em>, <em>Chosen</em>, or{' '}
                <em>Already have it</em> to build your palette.
              </p>
            </div>
          )}

          {/* Zone groups */}
          {ready &&
            totalEntries > 0 &&
            orderedZoneKeys.map((zoneKey) => {
              const entries = byZone.get(zoneKey) ?? []
              const label =
                zoneKey !== null
                  ? (zoneLabelMap.get(zoneKey) ?? 'Unknown zone')
                  : 'Anywhere in the yard'
              return (
                <ZoneGroup
                  key={zoneKey ?? '__unzoned__'}
                  zoneLabel={label}
                  zoneId={zoneKey ?? undefined}
                  entries={entries}
                  profile={profile.sunZones.length > 0 ? profile : null}
                  onOpen={onOpen}
                />
              )
            })}

          {/* Contribution rollup — the already_have payoff */}
          {ready && totalEntries > 0 && (
            <RollupPanel entries={list.entries} />
          )}
        </div>
      )}
    </section>
  )
}
