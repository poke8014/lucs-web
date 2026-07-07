'use client'

import { useMemo } from 'react'
import { nativePlants, plantBySlug } from '../plant-selector/corpus'
import type { SelectorPlant } from '../plant-selector/types'
import { sectionQuantities } from './placements'
import type { GardenPlan, PhaseState, Section } from './types'

// Mobile read-mode (unit I, §5). Editing is desktop/tablet work — tracing and
// placement are sit-down tasks — but a plan still has to be *useful in the yard
// and at the nursery* on a phone. So below the `sm` breakpoint we hide the canvas
// editor and render a read-focused reference instead: pick a plan, read the
// rollout (name · phase · season · hold), and read each section's plant list with
// quantities. No new route, no editing — just the plan, legible on a small screen.

const PHASE_LABEL: Record<PhaseState, string> = {
  untouched: 'untouched',
  cleanup: 'in cleanup',
  prepped: 'prepped',
  planted: 'planted',
  established: 'established',
}

const HOLD_LABEL: Record<string, string> = {
  cardboard: 'cardboard',
  mulch: 'deep mulch',
  none: 'nothing yet',
}

export interface MobileReadViewProps {
  plans: GardenPlan[]
  activePlan: GardenPlan
  activeId: string | null
  onSelect: (id: string) => void
}

export default function MobileReadView({
  plans,
  activePlan,
  activeId,
  onSelect,
}: MobileReadViewProps) {
  const corpus = useMemo(() => nativePlants(), [])
  const quantities = useMemo(
    () => sectionQuantities(activePlan.sections, activePlan.placements, corpus),
    [activePlan.sections, activePlan.placements, corpus],
  )

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/80 p-4">
        <p className="text-xs text-[#2a1d10]/70">
          Small screen — showing your plan as a read-only reference. It&rsquo;s best
          edited on a bigger screen (tracing and placing plants is sit-down work),
          but everything you need at the nursery is right here.
        </p>
      </div>

      {plans.length > 1 && (
        <div>
          <label
            htmlFor="mobile-plan-switcher"
            className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60"
          >
            Which plan
          </label>
          <select
            id="mobile-plan-switcher"
            value={activeId ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full rounded-md border border-[#2a1d10]/25 bg-white/70 px-3 py-2.5 text-base text-[#2a1d10] focus:border-[#2a1d10]/60 focus:outline-none"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <h2 className="font-serif text-2xl text-[#2a1d10]">{activePlan.name}</h2>
        <p className="mt-1 text-xs text-[#2a1d10]/55">
          One section at a time — the rest can wait under cover. Momentum beats ambition.
        </p>
      </div>

      {activePlan.sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#2a1d10]/25 bg-[#fff6df]/60 p-6 text-center text-sm text-[#2a1d10]/65">
          No sections yet. Open this plan on a bigger screen to map the yard and carve
          out beds — then this page becomes your in-yard checklist.
        </p>
      ) : (
        <ul className="space-y-3">
          {activePlan.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              species={quantities[section.id]?.bySpecies ?? {}}
              total={quantities[section.id]?.total ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function SectionCard({
  section,
  species,
  total,
}: {
  section: Section
  species: Record<string, number>
  total: number
}) {
  const rows = Object.entries(species)
    .map(([slug, count]) => ({ plant: plantBySlug(slug), count }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <li className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/85 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-lg text-[#2a1d10]">{section.name}</h3>
        {total > 0 && (
          <span className="flex-none text-xs text-[#2a1d10]/55">~{total} plants</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-[#2a1d10]/60">{rolloutSummary(section)}</p>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[#2a1d10]/55">
          No plants placed here yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate text-[#2a1d10]">
                {plantName(r.plant)}
              </span>
              <span className="flex-none text-[#2a1d10]/70">×{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** "in cleanup · fall 2026 · under cardboard until then" — the rollout line. */
function rolloutSummary(section: Section): string {
  const parts: string[] = [PHASE_LABEL[section.phaseState]]
  if (section.plannedSeason) parts.push(section.plannedSeason)
  if (section.holdMethod && section.holdMethod !== 'none') {
    parts.push(`under ${HOLD_LABEL[section.holdMethod] ?? section.holdMethod} until then`)
  }
  return parts.join(' · ')
}

function plantName(plant: SelectorPlant | undefined): string {
  if (!plant) return 'Unknown plant'
  return plant.common_names[0] ?? plant.scientific_name
}
