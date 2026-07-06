// "Grows with" — companions resolved to corpus plants where they exist.
// native.companions holds scientific binomials; we match them to corpus records
// (by scientific_name or alias) and render the resolvable ones as drawer links.
// Omit the whole section when nothing resolves (spec: omit when empty).

import { allPlants } from './corpus'
import PlantThumb from './PlantThumb'
import type { SelectorPlant } from './types'

function resolveCompanions(plant: SelectorPlant): SelectorPlant[] {
  const companions = plant.native?.companions ?? []
  if (companions.length === 0) return []
  const wanted = new Set(companions)
  const out: SelectorPlant[] = []
  const seen = new Set<string>()
  for (const cand of allPlants()) {
    if (seen.has(cand.slug)) continue
    const names = [cand.scientific_name, ...cand.aliases]
    if (names.some((n) => wanted.has(n))) {
      out.push(cand)
      seen.add(cand.slug)
    }
  }
  return out
}

export default function GrowsWith({
  plant,
  onOpen,
}: {
  plant: SelectorPlant
  onOpen: (slug: string) => void
}) {
  const companions = resolveCompanions(plant)
  if (companions.length === 0) return null

  return (
    <section>
      <h3 className="mb-2 font-serif text-lg text-[#2a1d10]">Grows with</h3>
      <p className="mb-2 text-sm text-[#2a1d10]/70">
        Documented growing alongside it in the wild.
      </p>
      <ul className="flex flex-wrap gap-2">
        {companions.map((p) => (
          <li key={p.slug}>
            <button
              type="button"
              onClick={() => onOpen(p.slug)}
              className="flex items-center gap-2 rounded-full border border-emerald-800/30 bg-emerald-50/70 py-1 pl-1 pr-3 text-sm text-[#2a1d10] hover:border-emerald-800/60 hover:bg-emerald-50"
            >
              <PlantThumb plant={p} className="h-7 w-7 flex-none rounded-full" />
              <span className="italic">{p.scientific_name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
