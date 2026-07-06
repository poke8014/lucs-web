// Add-to-list — visually complete but INERT placeholder. Unit D owns
// persistence.
//
// SEAM (Unit D): D implements the `plantList.ts` module
// (sunshower.plantList.v1 localStorage, PlantList/PlantListEntry per spec
// §"The plant list"), the list view, and the contribution rollup. D wires
// these buttons to add the plant with a chosen status
// ('considering' | 'chosen' | 'already_have') and optional destination zone.
// Until then the controls render disabled so the drawer looks complete without
// implying a working feature.

import type { SelectorPlant } from './types'

export default function AddToList({ plant }: { plant: SelectorPlant }) {
  // Unit D wires persistence: replace the disabled buttons below with handlers
  // that call plantList add/update, reflect current status, and offer the zone
  // picker. `plant` is threaded now so the signature is stable for D.
  void plant

  return (
    <section className="rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/60 p-4">
      <h3 className="mb-1 font-serif text-lg text-[#2a1d10]">
        Add to your plant list
      </h3>
      <p className="mb-3 text-sm text-[#2a1d10]/70">
        Build the palette your bed plan will place. Saved lists are coming soon.
      </p>
      <div className="flex flex-wrap gap-2">
        {(['Considering', 'Chosen', 'Already have it'] as const).map((label) => (
          <button
            key={label}
            type="button"
            disabled
            aria-disabled
            className="cursor-not-allowed rounded-md border border-[#2a1d10]/20 bg-[#fff6df]/50 px-3.5 py-2 text-sm text-[#2a1d10]/45"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
