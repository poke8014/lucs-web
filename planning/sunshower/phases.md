# Phases — detail

Sunshower is organized around the actual sequence a gardener moves through, not by feature taxonomy.

| Phase | Goal | App content | Status |
|---|---|---|---|
| **1. Cleanup & prep** | Identify what's in the yard, decide keep/remove, prepare beds for planting. | Weed/invasive ID, cleanup methods, soil prep for natives, timing windows. | Closed 2026-05-18 — polish only. |
| **2. Plant selection & sourcing** | Choose the right natives for the user's site; find them at nurseries. | Plant database, native range map, nursery finder, native/non-native/invasive tiering. | **Active** — 150 Calscape natives live; enrichment scrape then selector design. |
| **3. Garden planning tools** | Lay out beds, place plants, design for bloom succession and visual structure. | Layout planner, companion planting, bloom-season visualizer. | Concept work started. |
| **4. Ongoing care** | Seasonal calendar, lifecycle care, alerts for critical windows. | Seasonal care guide, per-plant care timelines. | Future. |

Phases overlap in research and content — but the content order and UX entry point mirror this sequence. A user who lands on the app should be able to start at Phase 1 if their yard is overgrown, or skip ahead if they've already cleared their planting area.

---

## Phase 1 — Yard Cleanup & Preparation (active focus)

### Goal

Help a user with any yard state — overgrown, weedy, partially planted, or bare — get to a clean canvas ready for native plantings, without losing whatever natives are already there or making the weed problem worse.

### Subtopics this phase covers

- **Identifying existing vegetation** — using iNaturalist, plant ID guides, and authoritative invasive/native references.
- **Weed triage** — invasive (must remove), non-native benign (decide based on goals), native (keep).
- **Cleanup methods** — sheet mulching (cardboard + mulch), solarization, smothering, manual clearing, when herbicide makes sense and when it doesn't.
- **Soil prep for natives** — explicitly *not* the generic "amend with compost" advice, which can harm drought-adapted natives.
- **Timing the cleanup-to-planting cycle** — California planting window is roughly mid-September to November.
- **Working around existing trees and structures** — what to leave alone, root protection during clearing.
- **Avoiding ecological succession traps** — disturbed bare soil invites the next wave of weeds; don't clear without a follow-up plan.

### Wiki anchors

`vault/concepts/` has since been built out (19 pages as of 2026-07-02). Phase-1-relevant pages that exist: [site-inventory](../../vault/concepts/site-inventory.md), [soil-basics](../../vault/concepts/soil-basics.md), [planting-technique](../../vault/concepts/planting-technique.md) (incl. cardboard/black-plastic suppression), [cal-ipc-scoring](../../vault/concepts/cal-ipc-scoring.md), [vegetative-spread](../../vault/concepts/vegetative-spread.md), [wildlife-coexistence](../../vault/concepts/wildlife-coexistence.md).

Still unbuilt from the originally anticipated set: removal-methods/sheet-mulching, soil-prep-for-natives, ca-planting-window — tracked as the 📋 "Phase-1 management concepts" item in [../sunshower_backlog.md](../sunshower_backlog.md).

### Priority sources to ingest

Full list in [resources.md](resources.md). Highest priority:

1. **Cal-IPC Invasive Plant Inventory** — the keep/kill triage.
2. **UC ANR — My Front Yard Pollinator Garden** — concrete CA cardboard sheet-mulching example.
3. **UC IPM weed photo gallery** — visual ID + management notes for common CA weeds.

### App features for this phase

- Walk-through of the cleanup sequence (identify → triage → choose method → execute → bridge to phase 2).
- Weed/invasive identification helper (linked to or wrapping iNaturalist + Cal-IPC).
- Cleanup-method comparison: pros/cons by yard state, time, effort, season.
- Timing reminders tied to user's region (e.g., "for Bay Area zone 9b, ideal sheet-mulching window is...").

Live Phase 1 MVP: [/sunshower/cleanup-plan](../../src/app/sunshower/cleanup-plan/page.tsx). GUI MVP backlog: [../sunshower_gui_mvp.md](../sunshower_gui_mvp.md).

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

Plant page schema lives in [vault/CLAUDE.md](../../vault/CLAUDE.md). Wiki pages live in `vault/plants/`.

### Plant tiering — native / non-native non-invasive / invasive

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

- Regions highlight on the map when a user clicks a plant.
- Conversely, users can click a region to browse all plants native to that area.
- Useful for distinguishing hyper-local from widespread species.
- Map data powered by the `regions` table and `plant_regions` junction (see [tech-stack.md](tech-stack.md)).

Possible map implementations: **Mapbox GL JS** (highly customizable), **Leaflet.js** (open source, lightweight), or **Google Maps API** (costs money at scale). Ecoregion boundary GeoJSON is publicly available from EPA and USDA.

### Priority sources to ingest

Full list in [resources.md](resources.md). Highest priority:

1. **Calscape** — CNPS plant finder, ZIP-code searchable. Closest to the schema the app needs.
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
- Spacing and sizing guidance ([vault/concepts/plant-spacing.md](../../vault/concepts/plant-spacing.md)).
- Layered design — back-to-front by height.

### Site inventory & bubble drawing

**Site inventory has moved forward:** it now ships as an app surface *between Phases 1 and 2* — the guided walkthrough at `/sunshower/site-inventory` (built 2026-07-04, spec: [sunshower_site_inventory_mvp.md](../sunshower_site_inventory_mvp.md)). It produces the localStorage `SiteProfile` the Phase-2 selector will consume. What remains Phase-3 territory is the drawing side: zone painting, sketch upload, and bubble-drawing iteration on top of that profile.

The planning UX should embrace the iterative low-fidelity workflow documented in:

- [vault/concepts/site-inventory.md](../../vault/concepts/site-inventory.md) — site conditions mapping.
- [vault/concepts/bubble-drawing.md](../../vault/concepts/bubble-drawing.md) — cheap iteration before commitment.

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

Each plant entry's seasonal care calendar (defined in Phase 2) becomes the source of truth for personalized reminders.

---

## Future / out-of-scope for v1

Possible additions once the v1 native pollinator garden ships:

- Fruits and vegetables section
- Pest and disease identification
- Watering schedule tracker
- Community plant swap / nursery reviews
- User-uploaded yard photos with progress timelines
- Native multi-state scaling — see [tech-stack.md](tech-stack.md)
