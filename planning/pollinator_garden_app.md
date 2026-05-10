# 🌸 Native Pollinator Garden App — Project Plan

## Project Overview

A guide-and-tool for new gardeners to plan, prepare, plant, and maintain a native California pollinator garden — designed to help users at **any starting point** (overgrown weedy lot, bare dirt, existing-but-tired garden) and **any experience level** (first-time gardeners through experienced gardeners new to natives).

The thesis is "right plant, right place" interpreted ecologically: native plants supporting the native pollinators that co-evolved with them. See [vault/concepts/right-plant-right-place.md](../vault/concepts/right-plant-right-place.md).

**User-zero:** Luc, gardening on his own yard in the San Jose foothills (Santa Clara County, near the Santa Cruz Mountains). The wiki and the app must immediately help his real journey, with other users joining in as the knowledge base grows.

> **Scope (v1):** Native pollinator garden only. Fruits, vegetables, pest/disease ID, watering trackers, and community features come later.

---

## Phasing

The app is organized around the actual sequence a gardener moves through, not by feature taxonomy:

| Phase | Goal | App content | Status |
|---|---|---|---|
| **1. Cleanup & prep** | Identify what's already in the yard, decide keep/remove, prepare beds for planting. | Weed/invasive ID, cleanup methods, soil prep for natives, timing windows. | **Active** — sourcing now. |
| **2. Plant selection & sourcing** | Choose the right natives for the user's site and pollinator goals; find them at nurseries. | Plant database, native range map, nursery finder, native/non-native/invasive tiering. | Foundations in place. |
| **3. Garden planning tools** | Lay out beds, place plants, design for bloom succession and visual structure. | Layout planner, companion planting, bloom-season visualizer. | Concept work started. |
| **4. Ongoing care** | Seasonal calendar, lifecycle care, alerts for critical windows. | Seasonal care guide, per-plant care timelines. | Future. |

Phases overlap in research and content — but the **content order and UX entry point** mirror this sequence. A user who lands on the app should be able to start at phase 1 if their yard is overgrown, or skip ahead if they've already cleared their planting area.

---

## Phase 1 — Yard Cleanup & Preparation (active focus)

### Goal

Help a user with any yard state — overgrown, weedy, partially planted, or bare — get to a clean canvas ready for native plantings, without losing whatever natives are already there or making the weed problem worse.

### Subtopics this phase needs to cover

- **Identifying existing vegetation** — using iNaturalist, plant ID guides, and authoritative invasive/native references to know what's in the yard.
- **Weed triage** — invasive (must remove), non-native benign (decide based on goals), native (keep).
- **Cleanup methods** — sheet mulching (cardboard + mulch), solarization, smothering, manual clearing, when herbicide makes sense and when it doesn't.
- **Soil prep for natives** — explicitly *not* the generic "amend with compost" advice, which can harm drought-adapted natives.
- **Timing the cleanup-to-planting cycle** — California planting window is roughly mid-September to November (ground still warm, plants entering active growth with winter rains coming).
- **Working around existing trees and structures** — what to leave alone, root protection during clearing.
- **Avoiding ecological succession traps** — disturbed bare soil invites the next wave of weeds; don't clear without a follow-up plan.

### Wiki anchors

None of these concept pages exist yet. Source ingestion will create them. Anticipated pages:

- `concepts/identifying-existing-vegetation`
- `concepts/invasive-vs-benign-weeds`
- `concepts/sheet-mulching` (or a broader `concepts/cleanup-methods` parent)
- `concepts/soil-prep-for-natives`
- `concepts/ca-planting-window`

### Priority sources to ingest

See **Resources Catalog → Phase 1** below. Highest priority:

1. **Cal-IPC Invasive Plant Inventory** — the keep/kill triage.
2. **UC ANR — My Front Yard Pollinator Garden** — concrete CA cardboard sheet-mulching example.
3. **UC IPM weed photo gallery** — visual ID + management notes for common CA weeds.

### App features for this phase

- Walk-through of the cleanup sequence (identify → triage → choose method → execute → bridge to phase 2).
- Weed/invasive identification helper (linked to or wrapping iNaturalist + Cal-IPC).
- Cleanup-method comparison: pros/cons by yard state, time, effort, season.
- Timing reminders tied to user's region (e.g., "for Bay Area zone 9b, ideal sheet-mulching window is...").

---

## Phase 2 — Plant Selection & Sourcing

### Goal

Given a prepared site, help the user choose appropriate native plants and find them at nurseries.

### Native plant database

Plants native to California, filterable by city/region. Each plant entry includes:

- Common and scientific name
- Pollinators it attracts (bees, butterflies, hummingbirds, etc.)
- Water and sun requirements
- Soil preferences
- Bloom times by season
- Growth stages and lifecycle info
- Seasonal care calendar (links to phase 4 content)
- Step-by-step care guide from soil prep → planting → maturity

Plant page schema is defined in [vault/CLAUDE.md](../vault/CLAUDE.md). Wiki pages live in `vault/plants/`.

### Plant tiering — native, non-native non-invasive, invasive

Not everything users want to grow is native — and that's okay if non-native choices are made deliberately. Plants are categorized:

- 🟢 **Native** — indigenous to the user's region, best for pollinators and ecosystem.
- 🟡 **Non-native, non-invasive** — introduced but not ecologically harmful, safe to plant.
- 🔴 **Invasive** — known to spread aggressively and harm native ecosystems, flagged with a warning.

App behavior:
- Users can filter the database by any combination of these tiers.
- Each non-native entry notes region of origin and ecological considerations.
- When a user selects a non-native, the app surfaces a gentle nudge with native alternatives ("Plants that serve a similar purpose: ...").

This broadens the app's appeal — many gardeners want a mix — while still steering away from invasives.

**Data sources for invasive classification:** Cal-IPC, USDA PLANTS Database, GBIF occurrence data.

### Sourcing & nursery finder

- Map of local nurseries that carry natives.
- Online seed and plant suppliers.
- Filter by plant species availability.
- Wiki pages live in `vault/nurseries/`.

### Native range map

Each plant detail page includes an interactive map showing where the plant is native:
- Regions highlight on the map when a user clicks on a plant.
- Conversely, users can click a region to browse all plants native to that area.
- Useful for distinguishing hyper-local from widespread species.
- Map data powered by the `regions` table and `plant_regions` junction table (see Database Architecture).

**Possible map implementations:**
- **Mapbox GL JS** — highly customizable, free tier available, great for shaded region overlays.
- **Leaflet.js** — open source, lightweight.
- **Google Maps API** — familiar but costs money at scale.

> 💡 Ecoregion boundary data (GeoJSON) is publicly available from the EPA and USDA — use these for region shapes.

### Priority sources to ingest

See **Resources Catalog → Phase 2** below. Highest priority:

1. **Calscape** — CA Native Plant Society plant finder, ZIP-code searchable. Closest to the schema the app needs.
2. **Las Pilitas Nursery** — opinionated CA-native plant pages with strong habitat framing.
3. **Xerces Society** — CA-specific pollinator plant lists.

---

## Phase 3 — Garden Planning Tools

### Goal

Help users lay out beds and place plants thoughtfully, accounting for site conditions, mature plant size, bloom succession, and visual structure.

### Garden layout planner

- Visual tool to map out garden beds (front and back yard).
- Drag-and-drop plant placement.
- Companion planting suggestions.
- Spacing and sizing guidance (see [vault/concepts/plant-spacing.md](../vault/concepts/plant-spacing.md)).
- Layered design — back-to-front by height (see Planting Frameworks below).

### Site inventory & bubble drawing

The app's planning UX should embrace the iterative low-fidelity workflow documented in:

- [vault/concepts/site-inventory.md](../vault/concepts/site-inventory.md) — site conditions mapping.
- [vault/concepts/bubble-drawing.md](../vault/concepts/bubble-drawing.md) — cheap iteration before commitment.

Implications: layout creation should be lightweight, with easy duplication of variants. A user shouldn't feel forced to "finalize" a layout before experimenting.

### Open questions for this phase

- Should the layout planner integrate with satellite/map view of the user's yard?
- How specific should regional filtering go — city-level, ZIP, ecoregion?

---

## Phase 4 — Ongoing Care

### Goal

Help a user maintain their garden through the seasons with timely reminders and species-specific care.

### Seasonal care guide

- Season-specific reminders and tasks.
- Alerts for critical care windows (pruning, watering adjustments, etc.).
- Full lifecycle guidance: soil prep → seedling → established plant → dormancy → regrowth.

### Per-plant care timelines

Each plant entry's seasonal care calendar (defined in phase 2) becomes the source of truth for personalized reminders.

---

## Future / Out-of-scope-for-v1

Possible additions once the v1 native pollinator garden is shipped:

- Fruits and vegetables section
- Pest and disease identification
- Watering schedule tracker
- Community plant swap / nursery reviews
- User-uploaded yard photos with progress timelines
- Native multi-state scaling (see Multi-State Scaling below)

---

## Planting Frameworks

Useful design patterns surfaced from the resources below. These will become wiki concept pages as their sources are ingested.

- **3x3x3 System** — choose 3 native species blooming in each of 3 seasons (spring, summer, fall) = 9 species × 3 plants each = 27 plants, covering ~8×4 ft. Beginner-friendly.
- **Plant in drifts** — group 3+ of the same species so pollinators notice them. Single isolated plants are less effective forage.
- **Layered design** — trees/large shrubs in back → medium shrubs → low perennials/groundcovers in front. Creates depth and habitat variety.

## Key Planning Principles

Top-level rules of thumb that should pervade the app's recommendations:

1. **Do a site inventory first** — sun exposure, shade patterns, slope, soil type, wind. See [vault/concepts/site-inventory.md](../vault/concepts/site-inventory.md).
2. **Map paths and structures** before placing plants.
3. **Plan for year-round bloom** — at least one plant flowering in every season.
4. **Use native perennials** — less maintenance, come back every year. See [vault/concepts/plant-life-cycles.md](../vault/concepts/plant-life-cycles.md).
5. **Leave some bare soil** — many native bees nest in the ground.
6. **Avoid pesticides** — especially neonicotinoids.
7. **Start small** — one bed or corner, then expand.
8. **Best CA planting time** — mid-September to November (ground still warm, plants in active growth with winter rains coming).

---

## Resources Catalog

Source candidates for ingest, organized by phase. ✅ = already ingested into [vault/](../vault/).

### Phase 1 — Cleanup & weed identification

- **Cal-IPC (California Invasive Plant Council)** — [cal-ipc.org](https://www.cal-ipc.org) — authoritative CA invasive inventory with severity ratings. **Highest phase-1 priority.**
- **UC IPM (UC Integrated Pest Management)** — weed photo gallery and management notes. [ipm.ucanr.edu](https://ipm.ucanr.edu)
- **UC ANR — My Front Yard Pollinator Garden** — real-world Bay Area native conversion using cardboard sheet mulching. [ucanr.edu](https://ucanr.edu/blog/spill-beans/article/my-front-yard-pollinator-garden)
- **iNaturalist** — used as a *tool* (in-yard plant ID), not a clipping. Outputs from iNaturalist sessions feed plant page creation.
- **Cal-IPC Bay Area / Santa Clara County subset** — region-specific invasive prioritization for Luc's location.

### Phase 2 — CA native plant data

- **Calscape Garden Planner** ⭐ — California Native Plant Society's plant finder, ZIP-code searchable, with pollinator info, sun/water needs, and bloom times. The richest CA-native data source. [calscape.org](https://calscape.org/design-ideas) / [gardenplanner.calscape.org](https://gardenplanner.calscape.org/)
- **Las Pilitas Nursery** — opinionated, dense CA-native plant pages with strong habitat framing. [laspilitas.com](https://laspilitas.com)
- **Calflora** — CA-specific species occurrence database.
- **CNPS Santa Clara Valley Chapter** — regional plant lists for Luc's location. [cnps-scv.org](https://cnps-scv.org)
- **USDA PLANTS Database** — public-domain national baseline, downloadable.
- **iNaturalist API** — public API with species data; useful for cross-referencing observations.

#### Pollinator-specific CA design guides

- **Waterwise Garden Planner — Pollinator Garden** — CA-specific palette. Tips: full sun, leave some unmulched soil for ground-nesting bees, leave logs/branches for wood-nesting bees. [waterwisegardenplanner.org](https://waterwisegardenplanner.org/garden-designs/pollinator-garden/)
- **US Fish & Wildlife — A Californian Yard to Help Pollinators** — from a CA botanist/biologist. Layered elevations, year-round bloom, food vs. host plants. Planning Feb–summer; planting mid-Sept–Nov. [fws.gov](https://www.fws.gov/story/californian-yard-help-pollinators)
- **US Fish & Wildlife — How to Build a Pollinator Garden** — step-by-step, pesticide-free perennials, seeds vs. transplants, spring/summer/fall bloom succession. [fws.gov](https://www.fws.gov/story/how-build-pollinator-garden)
- **Stanford — Create Your Own Native Pollinator Garden** — design docs for small/medium/large/XL gardens, plus pollinator fact sheets. [suwater.stanford.edu](https://suwater.stanford.edu/water-efficiency/water-wise-garden/create-your-own-native-pollinator-garden)
- **NRCS Pollinator Gardens Design Guide** — USDA PDF design guide. [nrcs.usda.gov](https://www.nrcs.usda.gov/sites/default/files/2022-09/PollinatorGardens.pdf)
- **Xerces Society** — pollinator conservation org with CA-specific plant lists and habitat guides.

### Phase 3 — Layout & design

- **Pretty Purple Door — Design a Garden Layout** ✅ — 9-step process, site inventory first. Already ingested. [prettypurpledoor.com](https://www.prettypurpledoor.com/design-a-garden-layout/)
- **Pretty Purple Door — Flower Gardening for Beginners** ✅ — foundational gardening basics. Already ingested. [prettypurpledoor.com](https://www.prettypurpledoor.com/flower-gardening-for-beginners/)
- **The Cottage Peach** — sun orientation (north-south for low crops, east-west for tall crops), shade mapping, slopes. [thecottagepeach.com](https://thecottagepeach.com/blog/how-to-plan-a-garden)
- **Gardenary** — layout types: border gardens, twin beds, garden trios. Good for front yard. [gardenary.com](https://www.gardenary.com/blog/how-to-start-a-garden-part-2-creating-a-garden-design)
- **Growing in the Garden** — labeling sunlight zones, planting areas, companion planting. [growinginthegarden.com](https://growinginthegarden.com/garden-planning-in-5-simple-steps/)
- **Three Acre Farm** — start small, commit to 5–10 new species per season, graph paper or software. [threeacrefarm.net](https://www.threeacrefarm.net/blog/2023/1/24/planning-your-garden-for-beginners)
- **Old Farmer's Almanac — Free Garden Plan Library** — includes a native/seasonal flower garden design for pollinators. [almanac.com](https://www.almanac.com/free-garden-layouts-plans-library)
- **Fine Gardening — Design Basics** — pathways, arbors, using trees/shrubs to block wind/sun. [finegardening.com](https://www.finegardening.com/article/garden-design-basics-creating-well-thought-plan)
- **Monrovia Design School — Pollinator Garden Styles** — layer plants by height, mix warm/cool tones, similar bloom times. [monrovia.com](https://www.monrovia.com/be-inspired/find-your-pollinator-garden-style.html)
- **3x3x3 System** — beginner pollinator-garden framework. [wildpollinators.ca](https://wildpollinators-pollinisateurssauvages.ca/2024/06/06/beginner-pollinator-garden-the-3-x-3-x-3-system/)

### Phase 4 — Ongoing care

(To be expanded as phase 4 sourcing begins.)

### Auxiliary references

- **Farmers' Almanac frost-date tool** — [almanac.com/gardening/frostdates](https://www.almanac.com/gardening/frostdates)
- **USDA Plant Hardiness Zone Map** — canonical winter-cold zone reference.
- **AHS Plant Heat Zone Map** — heat-tolerance complement to USDA zones (often more limiting than cold in CA).

---

## Tech Stack

### Frontend & hosting

- **Framework:** Next.js (App Router)
- **Hosting:** Vercel (existing domain)
- **Styling:** Tailwind CSS

### Content & data flow

- **Obsidian** as the CMS for narrative content — plant notes, nursery info, concept pages, source summaries written as markdown in [vault/](../vault/).
- Vault stored in this GitHub repo.
- Vercel pulls from GitHub on push → auto-redeploy.
- Markdown parsed at build time using **Next.js static site generation (SSG)**.
- **Supabase (Postgres)** for structured plant/region/pollinator data — see Database Architecture below.

```
Obsidian Vault (markdown)            Plant frontmatter (YAML)
        ↓  git push                          ↓  ETL on build
    GitHub Repo                       Supabase (Postgres)
        ↓  auto-deploy                       ↓
       Vercel  ←—————————— reads both ——————┘
        ↓
    Web App
```

### Why this approach

- Obsidian stays as the working research/note-taking tool.
- Narrative content (concept pages, source summaries) renders via SSG from markdown.
- Structured queries ("plants that bloom in spring AND attract bees AND need low water") go through Supabase, fed from plant-page frontmatter.
- No separate CMS to manage; changes go live with `git push`.

---

## Database Architecture

### Hybrid: Obsidian for narrative, Supabase for structured queries

| Tool | Role |
|------|------|
| **Obsidian (vault/)** | Research vault — concept pages, source summaries, plant pages with rich narrative. The working space. |
| **Supabase (Postgres)** | Structured database powering the app — clean, queryable plant records, regions, junction tables. |

**Workflow:** Research and write plant pages in Obsidian; their frontmatter is the source of truth for Supabase rows. Build-time ETL syncs.

### Vault structure (current)

The canonical schema is defined in [vault/CLAUDE.md](../vault/CLAUDE.md). Layout:

```
vault/
  CLAUDE.md          # the wiki schema
  README.md
  index.md           # content catalog (auto-maintained)
  log.md             # operations log (auto-maintained)
  llm-wiki.md        # Karpathy's pattern doc (reference)
  raw/               # IMMUTABLE source tier — raw clippings/PDFs/assets
    articles/        # cleaned web clippings
    pdfs/            # research papers, agency PDFs
    assets/          # downloaded images
  concepts/          # design principles, frameworks, ecological concepts
  plants/            # one page per plant species
  pollinators/       # bees, butterflies, hummingbirds, etc.
  regions/           # geographic entities (state, ecoregion, county, city)
  nurseries/         # local nurseries and online suppliers
  sources/           # one summary page per ingested source
  synthesis/         # cross-cutting analyses, comparisons
```

Folders are created the first time content lands in them — no preemptive empty taxonomy.

### Plant page frontmatter (the bridge to Supabase)

The full schema lives in [vault/CLAUDE.md](../vault/CLAUDE.md). Excerpt:

```yaml
---
type: plant
scientific_name:
common_names: []
plant_type:        # perennial | annual | shrub | tree | groundcover | grass | vine
nativity:          # native | non_native_safe | invasive
pollinators: []    # bees, butterflies, hummingbirds, moths, beetles, flies
water:             # low | moderate | high
sun:               # full | part | shade
soil: []
bloom_season: []   # winter, spring, summer, fall
height_ft:
width_ft:
regions: []
host_plant_for: [] # specific butterflies/moths
---
```

### Plant-to-region relationship (many-to-many)

Plants are native to multiple regions, so a junction table is needed:

```
plants table          plant_regions table       regions table
-----------           -------------------       -------------
plant_id              plant_id (foreign key)    region_id
name                  region_id (foreign key)   name
water_needs                                     state
sun_needs                                       ecoregion
...                                             zip_codes
```

### Region hierarchy

Regions are nested rather than flat:

```
State → Ecoregion → County → City/Zip
```

A user searching at city level inherits plants tagged at the ecoregion or state level above — no need to manually tag every plant at every level.

### Data sources for seeding the database

- **USDA PLANTS Database** — public domain, downloadable, good national baseline.
- **Calflora** — California-specific, has data access options.
- **iNaturalist API** — public API with species data.
- **Calscape** — richest CA native data; no public API. Investigate data export or partnership.
- **Manual enrichment** — care guides, seasonal info, and pollinator details will likely need to be added by hand from authoritative sources.

### Global plant distribution databases

For the native range map and broader context:

- **GBIF (Global Biodiversity Information Facility)** — [gbif.org](https://www.gbif.org) — billions of specimen records. Public API. Best for occurrence-by-region.
- **Plants of the World Online (POWO) by Kew Gardens** — [powo.science.kew.org](https://powo.science.kew.org) — 1.4M+ plant names, native range data. Public API. Best for descriptions and range polygons.
- **GIFT (Global Inventory of Floras and Traits)** — covers ~2,900 regions, 80% of known plant species. R package for access.
- **GlobalTreeSearch** — 60,065 tree species with country-level distribution.
- **World Checklist of Vascular Plants (WCVP)** — Kew Gardens, taxonomically curated.

> 💡 GBIF + POWO together cover the most ground — GBIF for occurrence/region data, POWO for descriptions and range polygons. Both free and open.

---

## Multi-State Scaling

The app is being built with future expansion to other states in mind. Rather than separate databases per state, the recommended approach is a **single database with a `region` field** on every plant record.

**How it works:**
- User selects state (and optionally city/ecoregion) on onboarding.
- App filters all queries by that region automatically.
- New states are added by importing more plant records — no new infrastructure needed.

**Data sources per state:**
- Each state has its own native plant societies and databases (Calflora for CA, Texas Native Plant Society, Florida Native Plant Society, etc.).
- USDA PLANTS Database is a 50-state baseline.

**Future consideration:** an `ecoregion` field (more specific than state) would be more accurate — many natives are regional within a state. CA itself has ~12 EPA Level III ecoregions; "California native" is a coarse instrument compared to "Central Coast native" or "Sierra Nevada foothills native."

---

## Open Questions

- [ ] What data source to use as the primary plant info backbone — Calscape, Calflora, iNaturalist, USDA PLANTS, or some combination?
- [ ] How specific should regional filtering go — city, ZIP, ecoregion?
- [ ] Native app, web app, or both?
- [ ] Should the layout planner integrate with satellite/map view of the user's yard?
- [ ] How does the app handle a user who's at the boundary of two ecoregions (e.g., Bay Area users straddling oak woodland and coastal sage scrub)?
- [ ] When two authoritative sources disagree on whether a plant is native to the user's region, how does the app present that?

---

*Last updated: 2026-05-07*
