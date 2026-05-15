---
type: source
title: UC IPM Pest Notes — Residential weeds (dataset)
aliases: [UC IPM, UC Statewide IPM, UC ANR Pest Notes, ipm.ucanr.edu]
tags: [dataset, weeds, removal, residential]
status: stable
sources: []
last_updated: 2026-05-14
---

# UC IPM Pest Notes — Residential weed series

The [UC Statewide Integrated Pest Management Program](https://ipm.ucanr.edu/) (UC ANR / UC Cooperative Extension) publishes peer-reviewed *Pest Notes* covering pests and weeds in California home gardens, landscapes, and lawns. The residential weed series is the **right tier for the Sunshower cleanup-plan audience** — same authoritative pedigree as [[sources/wric]] (DiTomaso et al.) but written for homeowners rather than natural-area managers.

Where WRIC tells you which herbicide rate works at the acre scale in a wildland setting, UC IPM tells you what a homeowner with a 4 oz spray bottle should do in a Bay Area front yard.

## Scope: weeds gardeners want gone, not just Cal-IPC invasives

This source unlocks the project-level scope decision [[feedback-sunshower-weed-scope]]: the cleanup-plan covers *plants you want out of your yard*, not just Cal-IPC-rated invasives. Most common garden weeds (dandelion, mallows, field bindweed, plantains, purslane, spurge) aren't on the Cal-IPC inventory because they aren't wildland invaders — but they're the bulk of what an average gardener actually pulls.

## What we ingested

**28 species-level Pest Notes** (residential weeds) scraped 2026-05-13 via firecrawl → [`vault/raw/articles/ucipm-residential/`](../raw/articles/ucipm-residential/). Plus **7 cross-cutting management documents** in [`vault/raw/articles/ucipm-general/`](../raw/articles/ucipm-general/) covering soil solarization, lawn-weed management, landscape weed management, woody-weed invaders, rose-bed weed management, and an introduction to invasive plants.

Both indices are at:

- [`vault/raw/articles/ucipm-residential/_index.md`](../raw/articles/ucipm-residential/_index.md)
- [`vault/raw/articles/ucipm-general/_index.md`](../raw/articles/ucipm-general/_index.md)

Scraper: [`vault/scripts/scrape_ucipm.py`](../scripts/scrape_ucipm.py). The Pest Note URL pattern is `https://ipm.ucanr.edu/PMG/PESTNOTES/pn<NUMBER>.html`, which 302s to a `home-and-landscape/<slug>/` permalink and renders cleanly via firecrawl.

## Document structure

Each Pest Note follows a consistent template:

1. **In Brief** — 3–5 bullet summary.
2. **Introduction** — origin, range in California, basic biology.
3. **Identification and Life Cycle** — morphology, reproductive biology, key field IDs.
4. **Impact** — what the weed does (competitive pressure, lawn/landscape problems, allergenic / toxic / mechanical hazards).
5. **Management** — the meat of the document. Hand-removal, cultural controls (mulching, mowing, solarization), chemical controls. Often broken into "Lawns and Turfgrass" vs "Landscape and Garden" subsections — UC IPM is unusually clear about *where* on a residential property a technique applies.
6. **Herbicide options table** — `glyphosate / 2,4-D / dicamba / triclopyr / ...` rated as preemergence and/or postemergence, with "Readily Available to Home Gardeners" column. Highest-signal column for retail vs licensed-applicator distinction.
7. **References + Publication Information** — UC ANR pub number, last revision date.

Some Pest Notes cover multiple congeners under one entry:

- **Brooms** — all five Cal-IPC broom genera (*Cytisus*, *Genista*, *Spartium*, *Ulex*; explicitly cites *C. striatus*).
- **Wild Blackberries** — *Rubus* spp., focusing on *R. armeniacus* and *R. ursinus*.
- **Mallows** — *Malva parviflora*, *M. neglecta*, etc.
- **Plantains** — *Plantago major*, *P. lanceolata*.
- **Chickweeds** — *Stellaria media* + *Cerastium fontanum*.
- **Spurges** — *Euphorbia maculata* and other prostrate / erect spurges.
- **Spotted-spurge** entry — primarily *E. maculata* + congeners.
- **Clovers** — *Trifolium repens* and lawn-clover relatives.
- **Creeping Woodsorrel and Bermuda Buttercup** — *Oxalis corniculata* + *O. pes-caprae*.

## Overlap with Cal-IPC-derived inventory

11 Pest Notes directly cover plants already in [`src/data/plants.json`](../../src/data/plants.json):

| Plant                                        | UC IPM Pest Note                            |
|----------------------------------------------|---------------------------------------------|
| *Cytisus scoparius*, *C. striatus*, *Genista monspessulana*, *Spartium junceum*, *Ulex europaeus* | Brooms |
| *Centaurea solstitialis*                     | Yellow Starthistle                          |
| *Conium maculatum*                           | Poison Hemlock                              |
| *Isatis tinctoria*                           | Dyer's Woad                                 |
| *Lepidium latifolium*                        | Perennial Pepperweed                        |
| *Oxalis pes-caprae*                          | Creeping Woodsorrel & Bermuda Buttercup     |
| *Rubus armeniacus*                           | Wild Blackberries                           |

The Pest Note is cited inline in [[plants/cytisus-scoparius]], [[plants/centaurea-solstitialis]], [[plants/conium-maculatum]], [[plants/isatis-tinctoria]], [[plants/lepidium-latifolium]], [[plants/oxalis-pes-caprae]], and [[plants/rubus-armeniacus]] alongside the WRIC narrative (where applicable).

The remaining **21 Pest Notes** cover residential weeds **not** in the Cal-IPC inventory — these are the new plant pages added in the May 2026 cleanup-plan scope expansion.

## How the app cites this

[`plants.json`](../../src/data/plants.json) records `removal_sources: string[]` per plant. UC IPM citation slugs follow the pattern `ucipm-residential/<page-slug>` and resolve to `vault/raw/articles/ucipm-residential/<page-slug>.md`. Where a plant has both a WRIC report and a UC IPM Pest Note, both should be listed — they target different audiences and the user-facing render can prefer the residential one.

## Nativity classification — non-Cal-IPC weeds

The existing `nativity:` vocabulary is `native | non_native_safe | invasive`. Most UC IPM residential weeds are non-Cal-IPC unwanted plants — they don't cleanly fit any of those three buckets. Decision (per [[feedback-sunshower-weed-scope]]): treat them as `nativity: invasive` for cleanup-plan purposes but **omit the `invasive:` Cal-IPC-rating block** when no Cal-IPC PAF exists. The picker doesn't sort by Cal-IPC rating, so the omission is invisible to users; it's only meaningful for restoration / data analyses where Cal-IPC-rated invasives are a distinct cohort.

**Native exception — Pacific poison-oak (*Toxicodendron diversilobum*).** The May 2026 rollout includes [[plants/toxicodendron-diversilobum]] with `nativity: native`. Homeowners routinely remove poison-oak from yards for safety reasons (urushiol allergic dermatitis affects 50–75% of California adults), even though it's a valued native plant in wildland contexts. It's the only native in the cleanup-plan picker — added per the user-zero framing ([[feedback-sunshower-weed-scope]]: scope is "plants you want gone," not "non-native invasives"). The `nativity: native` flag keeps structured queries distinguishable, while the picker treats it the same as any other entry.

## Citation

Each Pest Note includes its own recommended citation in the publication-information footer; surface that whenever Pest Note content is shown to users. Example:

> Wilen, C.A., O'Connell, R.A., and Kogan, M. 2018. *Pest Notes: Dandelion.* UC ANR Publication 7469. UC Statewide Integrated Pest Management Program.

## Deferred

- **Wikimedia / iNat photos for the new weeds.** Cal-IPC plants got photo coverage from the 2026-05-08 iNat pull; the 22 new weeds need a separate iNat pass once their wiki pages land.
- **Lawn-vs-landscape signal in `plants.json`.** UC IPM splits management by lawn / turf vs. ornamental landscape vs. bare ground. Current `removal_method` doesn't carry that distinction. Pilot first; revisit if the omission hurts user-facing copy.
- **Cross-cutting `ucipm-general` documents.** The 7 management documents (soil solarization, weed-mgmt-in-lawns, etc.) inform concept pages ([[concepts/sheet-mulching]], [[concepts/solarization]], etc.) rather than per-plant pages. Tackled in the Phase-1 management concepts ticket.
