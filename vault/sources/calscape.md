---
type: source
title: Calscape (dataset)
aliases: [CNPS Calscape, California Native Plant Society Calscape]
tags: [dataset, native-plants, plant-selection]
status: draft
sources: []
last_updated: 2026-05-17
---

# Calscape

[Calscape](https://calscape.org/) is the [California Native Plant Society](https://www.cnps.org/)'s native-plant gardening database — the **"what to plant" counterpart** to the [[sources/calipc|Cal-IPC]] "what to remove" inventory, and the data layer that unblocks Phase 2 (Selection). It pairs horticultural growing data with the **pollinator demand side** ([[concepts/right-plant-right-place]]'s ecological layer): per species it records which butterflies/moths it hosts, and what wildlife it attracts.

Calscape aggregates and editorially curates from Wikipedia, Calflora, Jepson eFlora, the CNPS Manual of Vegetation, Las Pilitas, Theodore Payne, and the Xerces Society; range maps derive from ~2M Consortium of California Herbaria field observations via Jepson ecoregions (see [Our data](https://calscape.org/our-data)). Imagery is from CalPhotos and Wikimedia (per-photo licensing).

## Why and how we scope it

California has **8,507** native taxa in Calscape — far too many, and ingesting all of them would *violate* RPRP (most are wrong for any single yard). Calscape's flagship feature is the lever: a **location filter** returns only taxa whose verified range includes a given point (observed within ~10 mi + matching ecoregion/climate).

**Scope decision (2026-05-16):** region-scoped to Luc's area — San Jose foothills / Bay Area (RPRP-correct, user-zero aligned; see [[concepts/right-plant-right-place]] and the project's location context). First ingest coordinates: **`lat=37.3382, lng=-121.8863`** (San Jose) → **150 taxa** — the same order of magnitude as the 158-entry invasive/weed DB, its literal native counterpart. Other coordinates (foothill vs valley-floor points, broader Bay Area) are a tuning knob for later passes.

## The export *is* the dataset (key finding)

Unlike Cal-IPC (2 scraped HTML docs per plant), Calscape's CSV/Excel export carries the **full structured dataset for every species in one request**:

```
GET https://calscape.org/export/search/?lat=<lat>&lng=<lng>
→ 200, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
→ "Native To California.xlsx" : 4 metadata rows + 1 header row + N species rows × 50 columns
```

For the SJ filter: **150 species rows × 50 columns**. The Calscape `/search` UI is infinite-scroll JS (no HTML pagination) — the export is the *only* clean enumeration path. No per-species page scrape is needed for the core dataset.

Two fields are **not** in the export and need a deferred per-page enrichment scrape:

1. **Full editorial "About" prose** — the multi-paragraph species narrative (the export has `Tips`/`Site Type`/`Propagation`/`Soil` free-text, but not the lede description).
2. **Named butterfly/moth host species** — the export gives only a *count* (`Butterflies and Moths Supported`); the named species (e.g. *Apodemia mormo* on *Eschscholzia*) live on the species page and its `/host` subpage. This is the high-value `host_plant_for` RPRP data — enrichment is worthwhile but not blocking.

Pages are therefore emitted at `status: stub` until enrichment.

## The 50-column schema → frontmatter mapping

| Calscape column | → frontmatter | Normalization |
|---|---|---|
| Botanical Name | `scientific_name`, `title`, filename slug | kebab(sci) |
| Common Name / Alternative / Other / Obsolete Names | `common_names`, `aliases` | de-invert `"Buckeye, California"`; de-dup |
| Plant Type | `plant_type` | enum collapse (`Annual herb, Perennial herb`→ longest-lived single; raw kept) |
| Attracts Wildlife | `pollinators` | map only Bees/Butterflies/Hummingbirds; full list → `native.attracts_wildlife` |
| Sun | `sun` + `native.sun_range` | tolerance *range* → preferred (sunniest) single; range kept |
| Water Requirement | `water` + `native.water_range` | Very Low/Low→low, Moderate→moderate, High→high; range kept |
| Flowering Season | `bloom_season` | split → winter/spring/summer/fall |
| Height / Width | `height_ft` / `width_ft` | parse `"30 - 115 ft"` / `"4 - 28 in"`; in→ft; range string |
| Soil Drainage + Soil pH | `soil` | **crude heuristic** (Fast→well-drained, Slow→moist, pH→acidic/neutral/alkaline) — see open questions |
| Communities / Communities (simplified) | `native.communities*` (+ future `regions`) | passthrough |
| Sunset Zones / Hardiness | `native.sunset_zones` / `native.hardiness` | passthrough; reconcile vs [[concepts/usda-hardiness-zones]] |
| Is Cultivar | `native.is_cultivar` | Y/N → bool |
| Nursery Availability / Rarity | `native.nursery_availability` / `native.rarity` | passthrough |
| Jepson Link / Plant Url | `native.jepson_url` / `native.calscape_url`, `## Sources` | passthrough |
| Form/Propagation/Tips/Site Type/Soil notes | `## Identify` / `## Grow` / `## Where it belongs` body | strip inline HTML |

Native plant pages use a different body shape than invasive pages (no `## Remove`): **Identify → Grow → Wildlife value → Where it belongs → Sources**.

## Schema: the `native:` frontmatter block (approved 2026-05-17)

Parallel to the established `invasive:` block; **approved by Luc 2026-05-17**. Captures native-specific data the flat schema has no home for, and **resolves two open backlog questions**: `is_cultivar` → *cultivar vs species* (cultivars often have reduced pollinator value); `communities`/`sunset_zones` → *microclimate-tagging*. It defines the future Supabase `native_attributes` table, mirroring how `invasive:` maps to `invasive_assessments`.

Final fields (the four marked **+** were added 2026-05-17 to serve the Phase-2 selector model below):

```yaml
native:
  butterflies_moths_supported:   # int — Calscape host count (named species pending enrichment)
  attracts_wildlife: []          # raw Calscape categories (Bats/Birds/Caterpillars incl.)
  plant_type_raw:                # + raw Calscape type ("Fern", "Annual herb, Perennial herb"…)
  sun_range:                     # full tolerance range (flat `sun` is the preferred point)
  water_range:                   # full tolerance range (flat `water` is the preferred point)
  ease_of_care:                  # + low-maintenance garden-goal facet
  soil_drainage: []              # + structured raw (flat `soil` is a coarse convenience tag)
  soil_ph:                       # + structured raw pH range
  communities: []                # ecology / garden-type facet
  communities_simplified: []
  companions: []                 # + scientific binomials — Phase-2 pairing graph
  sunset_zones:
  hardiness:
  nursery_availability:          # app-critical — can the user actually buy it?
  rarity:
  is_cultivar:                   # bool — cultivar-vs-species lever
  jepson_url:
  calscape_url:
  retrieved:
```

## Normalization questions — resolved (2026-05-17)

Resolving principle (from Luc): **the Phase-2 selector reads the structured `native:` block; the flat fields are coarse convenience only.** So we don't over-invest in lossy flat derivations — we capture clean structured facets + raw values.

1. **`soil:` heuristic** — made conservative: `well-drained` only from Fast drainage, `moist` only from "Standing", a pH tag only when the range is ≤2.0 wide (else nothing). Truth lives in structured `native.soil_drainage` / `native.soil_ph`, which the selector reads.
2. **`sun`/`water` ranges** — flat field = preferred point; full range in `native.sun_range` / `native.water_range`. Selector reads the range.
3. **`plant_type` multi-value + ferns** — flat field = single best-fit within the schema enum (`Annual herb, Perennial herb`→`perennial`; `Fern`→`perennial`, since the enum has no `fern`); the true Calscape value is preserved verbatim in `native.plant_type_raw`.
4. **`height_ft`/`width_ft` range strings** (`"13 - 39"`) — kept as-is; a Phase-2 numeric filter parses them. Low priority (size is a weak selection axis vs goal/ecology).
5. **`sources:` provenance divergence** — accepted: dataset-style source per the [[sources/calipc|Cal-IPC]] precedent. Provenance is this meta-page + the export recipe + per-plant `calscape_url`/`jepson_url`; no per-species `raw/` files.

## Phase-2 selector model (Luc, 2026-05-17)

How plant selection should work, per Luc — Calscape's own model is the reference, with additions. **This drives what the data layer must carry; build is later (Phase 2), not now.**

- **Location-scoped** (already done — the region filter that produced these 150).
- **Garden type by ecology** — group/filter by plant community (`native.communities`): a chaparral garden, an oak-woodland garden, a riparian garden.
- **Garden goal facets** — water-efficient (`water`/`water_range`), pollinator-supporting (`pollinators` + `butterflies_moths_supported`), bird-supporting (`native.attracts_wildlife` ⊇ Birds), low-maintenance (`native.ease_of_care`). All now captured.
- **User suggests their own plants** — same picker pattern as the cleanup-plan (autocomplete over `scientific_name`/`common_names`/`aliases`), not purely algorithmic push.
- **Plant pairing** — suggest companions that go well together, via the `native.companions` graph (now extracted).
- **Digestible batches** — present *fewer* plants at a time; progressive disclosure, small coherent groupings (lean on the companion graph + facet filters), not a 150-item dump.

Tracked as a Phase-2 design item in [sunshower_backlog.md](../../planning/sunshower_backlog.md).

## Licensing posture

Same two-tier model as Cal-IPC. Calscape's *prose* is editorially authored (Wikipedia-derived) → we ingest **facts into frontmatter, write our own prose, and cite Calscape + Jepson**, never copy descriptions. Structured facts (sun/water/soil/bloom/range) are factual data, not copyrightable as such. App-facing **photos stay on the permissive iNaturalist pull** (`vault/scripts/fetch_inaturalist_photos.py`), *not* CalPhotos (mixed per-photo licensing) — the established research-vs-display two-tier strategy.

## Tooling

[`vault/scripts/build_calscape_plant_pages.py`](../scripts/build_calscape_plant_pages.py) — committed, snake_case, stdlib-only (no openpyxl), self-downloads the export (or `--xlsx <path>`), idempotent. `--only "<sci>;<sci>"` for pilots, `--all` for full rollout, `--lat/--lng` to retarget the region. This is the *committed, re-runnable* home the backlog's tooling note asks for (vs the gitignored `.firecrawl/` Cal-IPC scripts).

## Status & rollout

- ✅ **Pilot (2026-05-17, `feat/calscape-ingest`)** — 6 taxa across all growth forms; mapping validated; fixes applied (HTML-entity decode, clean empty scalars).
- ✅ **Full 150 rollout (2026-05-17)** — `--all`; schema approved + normalization resolved by Luc. 150 `nativity: native` pages, all frontmatter valid. Bugs fixed mid-rollout: lone-`.` float-parse crash (`[\d.]+` → `\d+(?:\.\d+)?`), `Fern`→`perennial` mapping + `plant_type_raw`. By form: tree 12, shrub 20, vine 3, perennial 46, annual 50, grass 19. All `status: stub`.
- 📋 **Enrichment scrape** — per-species pages for editorial prose + named lep host species (`host_plant_for`); upgrades pages `stub → draft` and seeds the Pollinators index.
- 📋 **New concept pages likely needed** (discuss before writing, per vault workflow): `plant-communities` (Calscape's habitat vocab), `sunset-zones` (reconcile vs [[concepts/usda-hardiness-zones]]), `companion-planting`. The companion-plant graph in the export also enables cross-plant wikilinks.

## Relationship to other pages

- The native half of [[concepts/right-plant-right-place]] — Calscape supplies the data its "future native-plant ingest" note anticipated.
- Counterpart to [[sources/calipc]]; together they cover both ends of a cleanup→selection journey.
- Feeds the planned Supabase `plants` table + `pollinators`/`host_plant_for` join tables.
