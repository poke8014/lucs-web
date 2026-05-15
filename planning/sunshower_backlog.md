# Sunshower — Backlog

Coarse-grained task tracker for the [Sunshower project](sunshower.md). Domain-level entries, not individual tickets. The goal is multi-agent / multi-session coordination — one place to see what's done, in flight, queued, and blocked.

**Last updated:** 2026-05-15 — Beginner-gardening wiki ingest on `feat/beginner-gardening-ingest` (PR #13): 4 sources, 5 new concepts (garden-zoning, wildlife-coexistence, planting-technique + composting/pruning stubs), 4 concept updates, planning-doc ideas section. New App/UI backlog items added for homepage yard-state router, in-app site-inventory walkthrough, parallel-tracks UX, friendly-to-natives copy pass, Phase 4 (Care) gap. Prior entry: iNat photo pull for the 21 new UC IPM residential weeds (`feat/inat-photos-ucipm-weeds`); 158/158 picker rows at 5 photos. Earlier same day: `plants.json` wiring for the 22 weeds (PR #11, merged) — 21 new picker rows + Layer A/B/C/sources, `prune_host_below_attachment` enum for dodder.

## Conventions

| Status | Meaning |
|--------|---------|
| ✅ | Done — append completion date |
| 🚧 | In progress — name the owner (agent / person) and what they're doing |
| 📋 | Up next — ready to pick up |
| 🧊 | Icebox — future / low priority / not yet shaped |
| ❓ | Blocked or open question — note what's blocking |

**When picking up a task:** change 📋 → 🚧 and add owner.
**When finishing:** change 🚧 → ✅ and add the date.
**When adding a task:** append at the bottom of its domain section. Update **Last updated** at the top.

Backlog ≠ wiki log. Wiki operations (ingests, refactors, queries) are logged in [vault/log.md](../vault/log.md) — that's the chronological record of what was filed in the wiki. This backlog is the project plan: what we've decided to do, what's in flight, what's queued.

---

## Cal-IPC data ingest

The California Invasive Plant Council Inventory — see [vault/sources/calipc.md](../vault/sources/calipc.md).

- ✅ Plan ingest pipeline (raw → wiki → Supabase) (2026-05-08)
- ✅ Top-tier scrape: 137 plants × 2 docs (profile + PAF) → `vault/raw/articles/calipc/` (2026-05-08)
- ✅ Top-tier wiki ingest: 137 plant pages, 1 curated + 136 stubs, with full invasive frontmatter (2026-05-08)
- ✅ Cross-cutting concepts filed: cal-ipc-scoring, vegetative-spread, horticultural-introduction-pathway (2026-05-08)
- ✅ Synthesis: [calipc-top-tier-overview](../vault/synthesis/calipc-top-tier-overview.md) — patterns + foothills-priority subset (2026-05-08)
- ✅ WRIC scrape — regional first pass: 7 PDFs (Cytisus, Foeniculum, Genista, Hedera, Rubus, Spartium, Ulex) landed in `vault/raw/pdfs/wric/` for foothills invasives that already have Cal-IPC profiles; full 274-PDF Box archive catalogued in `vault/raw/pdfs/wric/_index.md` with file IDs and a download recipe for future passes (2026-05-08). WRIC migrated reports to a Box folder while their site is "under construction"; legacy `wric.ucdavis.edu/information/natural areas/...` URLs that Cal-IPC pages link to all 302 to the placeholder now.
- ✅ **WRIC wiki ingest** — All 38 annotated plants now at `status: draft` with Identify / Remove / Prevent sections populated from WRIC + UC IPM Pest Notes. 28 unique WRIC files cover the inventory (8 multi-species, e.g. Hedera covers helix/canariensis/hibernica jointly); 2 congener citations (Acacia dealbata via A. melanoxylon; Cytisus striatus via C. scoparius); 1 plant (stinknet, *Oncosiphon pilulifer*) post-dates the 2013 WRIC book and uses county Ag Commissioner synthesis instead. PDF-reader blocker resolved by switching to firecrawl scraping the Box-hosted PDFs (recipe in [vault/scripts/scrape_wric.py](../vault/scripts/scrape_wric.py)). Pilot logged 2026-05-11 (5 plants); full rollout logged 2026-05-12 (remaining 33). `sources/wric.md` meta-page also landed. (2026-05-12)
- 📋 WRIC scrape — broader passes as needed (remaining 267 PDFs in the archive). Recipe in `vault/raw/pdfs/wric/_index.md`. Pull on demand once Cal-IPC tier expands or specific species come up.
- ✅ Photo download from Cal-IPC profiles: 540 images → `vault/raw/assets/calipc/<slug>/`, 137 plant subfolders, 140 MB total (2026-05-08). Plant pages do not yet reference these locally — wiring covered in the Photo sourcing section below.
- 📋 Cal-IPC Limited tier scrape + ingest (~89 additional plants × 2 docs).
- 📋 Cal-IPC Watch tier scrape + ingest (~105 PRE pages — *different schema* from PAF; will need a separate parser pass).
- 📋 Cal-IPC Species ID Cards — separate PDF asset on Cal-IPC for a subset of plants. Designed for visual yard identification; high-value for user-facing app.

## Photo sourcing (display-tier)

Two-tier strategy: **research photos** (already in `vault/raw/assets/calipc/` from Cal-IPC — high botanical quality, but unclear redistribution rights) stay in the wiki for reference and never reach end users. **Display photos** (permissively-licensed, app-facing) are pulled separately from sources with explicit commercial-use OK and stored alongside attribution metadata. Cal-IPC photos are kept for our reference only.

- ✅ iNaturalist photo pull for the 137 Cal-IPC invasives — license filter `cc0,cc-by`, cap 5/plant with one-photo-per-photographer, synonym resolution via iNat `matched_term` with parent-species fallback. 626 photos, ~275 MB → `vault/raw/assets/inaturalist/<slug>/{NN.jpg, metadata.json}`. Coverage: 118 full / 19 partial / 1 parent-fallback. Logged in [vault/log.md](../vault/log.md) under `[2026-05-08] ingest | inaturalist photo fetch`. (2026-05-08)
- ✅ **Synonym-resolution spot-check** — manually verified the 6 reclassified/fallback iNat taxa (`fallopia-japonica` → *Reynoutria japonica*; `pennisetum-setaceum` → *Cenchrus setaceus*; `eichhornia-crassipes` → *Pontederia crassipes*; `polygonum-sachalinense` → *Reynoutria sachalinensis*; `brassica-nigra` → *Mutarda nigra*; `centaurea-jacea-ssp-pratensis` parent-species fallback) by opening each photo set and matching diagnostic features against trusted references. All 6 confirmed. Side finding: ~14 plants resolved via the fetcher's second-pass synonym retry have `photos_taxon_id`/`photos_from_parent_species` as `None` (older schema) — non-blocking; a re-run would normalize. (2026-05-09)
- ✅ **Wire photos into plant pages** — `vault/scripts/wire_photos_into_plant_pages.py` inserts a `## Photos` section before `## Sources` in every `vault/plants/*.md`, with `### iNaturalist` (attribution + observation URL from `metadata.json`) and `### Cal-IPC` (photographer + year parsed from filename) subsections. Idempotent. All 137 pages populated (`triadica-sebifera` lacks Cal-IPC; `centaurea-jacea-ssp-pratensis` carries the parent-species note). (2026-05-09)
- ✅ **iNat partial top-up** — added `--allow-duplicate-users` flag to `vault/scripts/fetch_inaturalist_photos.py`. Two changes lifted the 19 stuck slugs: (1) relax the per-photographer dedup, (2) merge `popular=true` results with the unfiltered research-grade query (the original fetch only fell back to unfiltered when popular was empty — for partials, popular returned a few obs and we never reached the broader pool). Idempotent on `photo_id`. All 19 reached 5/5; 137/137 plants now at full coverage. (2026-05-09)
- 📋 Wikimedia Commons fallback — for plants where iNat top-up still leaves gaps (genuine CC photographer scarcity). Wikimedia tends to have consistently clean licensing and good botanical reference shots; smaller but complementary coverage to iNat.
- 🧊 Photo attribution UI surface — when users see a photo in the app, the photographer name + license needs to render. Out of scope until UI work begins; flagging now so the data layer captures attribution from the start (already captured in iNat `metadata.json`).

## Common weed ingest (UC IPM Residential Pest Notes)

Project-level scope expansion (2026-05-14): cleanup-plan covers **plants gardeners want out of their yard**, not just Cal-IPC-rated invasives. The average gardener doesn't sort by invasive vs. not. See [vault/sources/ucipm-residential.md](../vault/sources/ucipm-residential.md) for the dataset meta-page.

- ✅ Scrape pipeline + 28 Pest Notes → `vault/raw/articles/ucipm-residential/`. 10 overlap with Cal-IPC plants (already cited inline in [[plants/cytisus-scoparius]] et al.); 22 cover residential weeds not in the Cal-IPC inventory. (2026-05-13)
- ✅ Scrape pipeline + 7 cross-cutting management docs → `vault/raw/articles/ucipm-general/` (soil solarization, lawn-weed mgmt, landscape weed mgmt, woody-weed invaders, rose-bed weeds, invasive-plants intro). (2026-05-13)
- ✅ Source meta-page [[sources/ucipm-residential]] documenting scope, document structure, citation, and nativity-handling for non-Cal-IPC weeds. (2026-05-14)
- ✅ **Pilot wiki ingest** — first 5 residential weeds (dandelion, field-bindweed, common-purslane, mallows, spotted-spurge) covering distinct biologies. Validated the template before the full rollout. (2026-05-14)
- ✅ **Full wiki ingest** — 16 remaining residential weeds + native-reference poison-oak (21 total new plant pages: annual-bluegrass, burning/stinging-nettles, catchweed-bedstraw, chickweeds, clovers, common-groundsel, common-knotweed, dallisgrass, dodder, green-kyllinga, kikuyugrass, plantains, pokeweed, puncturevine, russian-thistle, poison-oak). Plus dyer's woad (*Isatis tinctoria* — Cal-IPC stub upgraded to draft with UC IPM management content). (2026-05-14)
- ✅ **Sync new weeds to `plants.json`** — Layer A/B/C + `removal_sources` wired for all 22 (21 new + dyer's woad upgrade) via [vault/scripts/add_ucipm_weed_entries.py](../vault/scripts/add_ucipm_weed_entries.py) (new) plus extensions to the 4 existing apply/backfill scripts. Picker DB grew 137 → 158; annotated subset 38 → 60. New `RemovalMethod` enum value `prune_host_below_attachment` introduced for dodder (parasitic — the action targets the host, not the weed); the existing 10-method vocabulary covered everything else. Cal-IPC overlap plants (brooms × 5, yellow starthistle, poison hemlock, perennial pepperweed, Bermuda buttercup, Himalayan blackberry) now carry both WRIC + UC IPM citations. Vocabulary + per-plant roster: [[synthesis/invasive-removal-methods]]. (2026-05-15)
- ✅ **iNat photo pull for new weeds** — same recipe as the Cal-IPC 137-plant pull: `vault/scripts/fetch_inaturalist_photos.py` (CC0/CC-BY, research-grade + popular, 5/plant, one-photographer cap; salsola-tragus topped up via `--allow-duplicate-users`). 105 new photos for the 21 net-new picker rows. Wikimedia Commons fallback turned out *not* to be needed — cosmopolitan species had abundant CC contributors. New `vault/scripts/sync_inat_photos_to_plants_json.py` reflects iNat `metadata.json` into `plants.json` `photos[]` (4-field projection); same run picked up a pre-existing drift in the 137 Cal-IPC plants (3 → 5 photos each, post-2026-05-09 top-up that was never synced to plants.json). 158/158 picker rows now at 5 photos. (2026-05-15)
- 🧊 **Cross-cutting concepts page: "disturbed-soil weeds — what they're telling you"** — Russian thistle, puncturevine, knotweed, kikuyugrass, dyer's woad, dodder all have UC IPM management notes that point to upstream soil conditions (compaction, bare disturbed soil) as the fix. Pattern noted in the 2026-05-14 rollout log; promote to a concepts page when a few more plants accumulate.

## Native plant ingest

The "what to plant instead" half of [[concepts/right-plant-right-place]] — Phase 2 plant selection.

- 📋 Calscape (CNPS) ingest strategy — sister source to Cal-IPC for native species. Single-page-per-species; same scrape pattern likely applies.
- 🧊 Calflora / Jepson Interchange — secondary native plant data sources.
- 🧊 Bloom-time data — possibly from Calscape, possibly inferred from Jepson. Needed for bloom-succession planning.

## Schema / wiki maintenance

- ✅ `invasive:` frontmatter namespace defined in [vault/CLAUDE.md](../vault/CLAUDE.md) (2026-05-08)
- ✅ Dataset source-meta-page convention (one page per dataset, not per record) (2026-05-08)
- ✅ `raw/articles/<source-slug>/` subfolder convention for bulk-scraped sources (2026-05-08)
- 📋 Phase-1 management concepts (removal-techniques, reinfestation-prevention, fire-risk, toxicity-handling, disposal) — unblocked by the 2026-05-12 WRIC rollout; cross-cutting content from the plant pages can now be lifted into standalone concept pages.
- 🧊 Phase-2 selection concepts (pollinator-value-types, bloom-succession, drought-tolerance-classes, cultivar-vs-species, plant-roles) — defer until Phase 1 cleanup workflow is functional.
- 🧊 Region pages beyond Central West (Northwest, Great Valley, Sierra Nevada, Southwest) — backfill on demand when foothill scope expands.
- 📋 Lint pass after WRIC + Calscape ingests — flag orphan pages, stub pages with enough sources to upgrade, broken cross-references.

## App / Database (Supabase)

The structured layer — vault frontmatter is the source of truth; Supabase is derived.

- 📋 Supabase project setup (Postgres + auth)
- 📋 `plants` table schema mirroring shared + native-relevant frontmatter fields
- 📋 `invasive_assessments` table schema mirroring `invasive:` block (joined to plants on plant_id)
- 📋 Frontmatter → Postgres seed script (`vault/plants/*.md` → `plants` + `invasive_assessments` rows)
- 🧊 Wikilink resolution: `regions: [[regions/bay-area]]` → foreign keys to a regions table
- 🧊 `pollinators`, `host_plant_for` join tables (when native plants are ingested)

## App / UI

- 🚧 **User-zero MVP — pick list → confirmed list → attack plan.** Phase 1 entry point at [/sunshower/cleanup-plan](../src/app/sunshower/cleanup-plan/page.tsx). Three steps:
  1. ✅ **Input.** Autocomplete picker over the 137-plant Cal-IPC DB (scientific / common / alias search, photo thumbs, matched-term disambiguation). PR #4 (Agent A, 2026-05-11).
  2. ✅ **Confirm.** Per-pick photo verification with a full-viewport lightbox; per-row keep/drop. Shipped alongside Agent A.
  3. 🚧 **Plan.** Action plan grouped by `removal_method` (Layer A) + yard-wide summary card grid for timing / tools / cautions / multi-year follow-up (Layer B). Still pending: yard-state-driven "prep the area for planting" section (blocked on Agent C) and a "coming next" placeholder (Phase 2 handoff).
  - Out of scope for MVP: in-app photo recognition, satellite/yard map overlay, multi-yard accounts, login.
  - See [planning/sunshower_gui_mvp.md](sunshower_gui_mvp.md) for the per-agent breakdown of the remaining work.
- 🧊 In-app identification flow — user uploads a photo or describes plant; app does the matching (replaces the offline iNat step in the MVP above).
- 🧊 Plant selection UI — given site conditions, suggest native plants (Phase 2).
- 🧊 Authentication / user yards (one user → many plant inventories per yard).
- 🚧 **Three.js landing/hero scene for the garden app entry page.** Persistent canvas + Phase-1-themed scene (rain / sun / weed tufts / shovel hotspot) shipped in commit `35d4422` — [src/app/sunshower/Scene.tsx](../src/app/sunshower/Scene.tsx) renders at the route layout so it doesn't remount on navigation. Remaining: stylized native CA flora + pollinator motif (bees, butterflies, hummingbirds) — current scene is cleanup-flavored, not yet the broader pollinator visual identity. Constraints: single canvas, lazy-loaded, mobile-friendly, mind LCP/bundle budget. Avoid generic "vibey portfolio" aesthetic.
- 📋 **Visible-path navigation across the four phases.** Render Cleanup → Selection → Planning → Care as a literal trail (stepping stones / waypoint markers) inside the `/sunshower` three.js scene. Each stop is a clickable hotspot routing to its phase; camera tweens on linear traversal, direct jumps short-circuit to the target. Persistent-canvas plumbing already landed (above); shovel currently routes to cleanup — pattern proven. Pair with a HUD breadcrumb / chapter-overlay so deep-linked users can jump without learning the metaphor. Reference experience: [persepolis.getty.edu](https://persepolis.getty.edu/). Pattern + inspiration sites in [planning/sunshower/tech-stack.md → Navigation pattern](sunshower/tech-stack.md#navigation-pattern-planned) and [REFERENCES.md](sunshower/REFERENCES.md).
- 🧊 **Phase 3 bed layout planner — three.js as the structural rendering layer.** Mature plant footprints, height layering (back-to-front by size), sun/shade overlays, and bloom-succession scrubbing across seasons. This is where 3D earns its weight functionally; the landing scene above is the warm-up. Defer until Phase 1 cleanup workflow is shipped.

### Beginner-gardening ideas (added 2026-05-15)

Surfaced from the 4-article beginner-gardening ingest — see [planning/sunshower/CONTEXT.md → Ideas surfaced from beginner-gardening ingest](sunshower/CONTEXT.md#ideas-surfaced-from-beginner-gardening-ingest-2026-05-15) for the narrative rationale.

- 📋 **Homepage yard-state router — "How's your yard looking today?"** Phase-routing prompt on `/sunshower` with cycling placeholder examples (overgrown / partially planted / mostly bare / established). Yard state stops being a cleanup-plan-internal input and becomes the app's front door. Routes: overgrown → cleanup-plan, mostly bare → site-inventory → selection, established → care, partially planted → cleanup-plan with a care/selective-cleanup framing. Reframes Agent C in [sunshower_gui_mvp.md](sunshower_gui_mvp.md). For MVP, the cleanup route is the only one fully connected; the others can show an interim "Coming soon" interstitial with wiki-page links. Unblocks Agent D's "prep for planting" section.
- 📋 **In-app site-inventory walkthrough.** Expose [vault/concepts/site-inventory.md](../vault/concepts/site-inventory.md) as a guided in-app flow — sketch upload or canvas, aspect (compass-app prompt), sun map (hourly-photo prompt → 5-tier zoning), wind, slope, utilities, sightlines. Reusable from any phase route since selection and care both depend on it. Sits between cleanup and selection in the linear traversal. **Soil/pH indicator-plant prompt slots in here** — *"see any rhodos or lavenders nearby?"* as the low-friction first-pass acid/alkaline read, before any test-kit step. Idea source: [vault/sources/gardenersworld-soil-ph.md](../vault/sources/gardenersworld-soil-ph.md) + [vault/sources/summerwinds-sun-exposure.md](../vault/sources/summerwinds-sun-exposure.md).
- 🧊 **Parallel-tracks UX — passive mapping + active in-yard removal.** Keep both kinds of tasks live at once: a user can map their landscape at the kitchen table or phone-in-hand at the window while actively pulling weeds outside. Concretely: a "what to do indoors today" vs. "what to do outdoors today" split in the cleanup-plan + site-inventory checklists, or a unified task list with venue tags. Cardboard / black-plastic suppression of un-worked beds (see [vault/concepts/planting-technique.md](../vault/concepts/planting-technique.md)) is the bridge — passive suppression runs while the user works elsewhere. Shape this further when the homepage router + site-inventory walkthrough land.
- 📋 **Copy pass — friendly-to-natives, not aggressive-to-weeds.** Lean cleanup-plan + landing copy toward *supporting native plants and pollinators* rather than *destroying invasives*. The plant-classification distinction (Cal-IPC invasive vs. common residential weed vs. native) is the lever — common weeds shouldn't carry the same urgency-language as Cal-IPC High invasives. Affects [src/app/sunshower/cleanup-plan/page.tsx](../src/app/sunshower/cleanup-plan/page.tsx) section headings, `SummaryCard` labels, and the landing page copy. Reference: [vault/concepts/wildlife-coexistence.md](../vault/concepts/wildlife-coexistence.md).
- 📋 **Phase 4 (Care) — wiki + app content gap.** Empty Care phase today + no in-app destination for users with established yards. Two parallel tracks: **(a) wiki** — ingest a CA-native care source (watering for natives, feeding caveats, pruning timing including pollinator-overwintering, mulch timing); the generic care content in [vault/concepts/watering.md](../vault/concepts/watering.md), [vault/concepts/composting.md](../vault/concepts/composting.md), and [vault/concepts/pruning.md](../vault/concepts/pruning.md) all carry "may not apply to CA natives" caveats currently. **(b) app** — Phase 4 landing destination, even if just a "coming soon + interim links to existing wiki pages." Homepage yard-state router will surface this gap fast once it ships (an "established" answer has nowhere to go today).

### Cleanup-plan rendering — wiring the WRIC/UC IPM data into the user-facing plan (added 2026-05-12)

The MVP's Plan step (#3 above) currently renders one card per plant, with the "method" string derived from `spread_mechanisms` and `removal_notes[]` not rendered at all (see "for now, methods reflect spread mechanism only" comment in [src/app/sunshower/cleanup-plan/plan.ts](../src/app/sunshower/cleanup-plan/plan.ts)). The data we now have in `src/data/plants.json` + the wiki rollout supports a richer two-section output: a top-level yard-wide summary (sequencing, shared cautions, multi-year horizon) followed by per-plant cards grouped by `removal_method` with the WRIC/UC IPM-grounded notes. Three layers, sequenced A → C → B.

- ✅ **Layer A — Wire `removal_method` + `removal_notes[]` into the cleanup-plan render.** `buildPlan` now returns `MethodGroup[]` (`{ method, methodLabel, plants: { plant, notes }[] }`) bucketing on `plant.removal_method`; the spread-mechanism `methodFor` heuristic is gone. `PlanSection` renders one card per action — method label as the heading, plants listed under it with photo thumb, Cal-IPC badge, and `removal_notes[]` as bullets. Group order: worst Cal-IPC severity in group → group size desc → method key alpha; null-method plants sink to a single "Method not yet documented" group with `spread_mechanisms`-derived fallback bullets. Three brooms now collapse to one shared action card. (2026-05-12)
- ✅ **Layer B — Top-level cleanup summary above the per-plant cards.** New `removal_timing_window`, `requires_followup_years`, `safety_flags[]` schema fields populated for the 38 annotated plants via [vault/scripts/apply_layer_b_fields.py](../vault/scripts/apply_layer_b_fields.py). `buildSummary` in [plan.ts](../src/app/sunshower/cleanup-plan/plan.ts) returns four buckets — tools (union of per-method tool lists + universal landfill-bag line), timing (plants bucketed by window, sorted Jan→Dec), cautions (closed-vocabulary `SafetyFlag` → human-readable yard-wide warning; `fragment_spreader` escalates at 2+ plants), and multi-year follow-up (≥5-year horizons). Rendered above the action plan as a 2×2 grid of `SummaryCard`s in [page.tsx](../src/app/sunshower/cleanup-plan/page.tsx). (2026-05-13)
- ✅ **Layer C — Refresh `removal_notes[]` in `plants.json` from the WRIC + UC IPM wiki rollout.** All 38 annotated plants regenerated via [vault/scripts/apply_layer_c_notes.py](../vault/scripts/apply_layer_c_notes.py) — concrete herbicide dilutions (e.g., Garlon 4 Ultra 1:4 in water for brooms; chlorsulfuron 1–2.6 oz/acre for pepperweed; undiluted glyphosate cut-stump for Arundo within 1–2 min), timing windows (Garlon foliar on fennel late Feb–early March; flower-bud-stage mow-then-spray for pepperweed; 8% v/v low-volume glyphosate for the Cortaderia pair after flowering), and what-doesn't-work warnings (don't mow Hedera/Vinca/Delairea/Clematis — fragments regenerate; don't burn brooms/gorse alone — fire triggers seedbank; don't till pepperweed — fragments propagate). Bullets average 4.8 per plant (range 4–5). Same idempotent DATA-dict pattern as Layer B. (2026-05-14)

## Scrapaholic retirement

The `/scrapaholic` project is archived. `main` carries only active project links and code; scrapaholic is preserved on the `archive/scrapaholic` branch.

- ✅ Cut `archive/scrapaholic` branch from `main` at the pre-removal state (full code + Prisma schema + planning docs intact). Pushed to origin. (2026-05-10)
- ✅ Removed `/scrapaholic` route, API handlers, lib modules, Prisma models, and middleware from `main` (commits `dd33e86` + follow-up `fbac3e8`). Package.json deps for Google AI, Firecrawl, Prisma, pg all dropped. (2026-05-10)
- ✅ CLAUDE.md no longer mentions scrapaholic — clean break rather than an "archived" pointer; archive branch is the only reference. (2026-05-10)
- 📋 **`scrapaholic.lucttang.dev` subdomain decision** — DNS still points at the old route. Options: take down in Vercel, redirect to a static archive notice, or point at the archive branch's deploy. Followups in commit `dd33e86` message also include dropping `products` / `certification_cache` / `scrape_cache` / `brand_reputation` tables in Postgres and removing `SCRAPAHOLIC_PASSWORD` / `FIRECRAWL_API_KEY` / `GEMINI_API_KEY` / `APIFY_API_TOKEN` env vars in Vercel.

## Tooling

Scripts live in [.firecrawl/](../.firecrawl/) for now (gitignored — promote to `ops/` if they become long-lived).

- ✅ firecrawl scrape pipeline: `build-jobs.sh`, `run-scrape.sh` (2026-05-08)
- ✅ Plant page generator: `build-plant-pages.py` — parses Cal-IPC PAF + profile, emits plant pages with frontmatter (2026-05-08)
- ✅ Aggregate stats: `aggregate-stats.py` — cross-plant statistics for synthesis pages (2026-05-08)
- ✅ iNaturalist photo fetcher: `vault/scripts/fetch_inaturalist_photos.py` — scientific-name lookup with `matched_term` synonym resolution + parent-species fallback, license/quality-grade filters, per-plant cap with one-photo-per-photographer, idempotent (2026-05-08)
- 📋 Promote Cal-IPC ingest scripts to `ops/calipc-ingest/` once stable and re-runnable (e.g., when WRIC content lets us regenerate plant pages with richer body content). Note inconsistency: iNat fetcher lives at `vault/scripts/` (committed), Cal-IPC scripts at `.firecrawl/` (gitignored) — pick one home when promoting.
- 🧊 Equivalent scripts for Calscape / WRIC ingests when those sources are tackled.

## Documentation

- ✅ [Project home — planning/sunshower/](sunshower/) (split 2026-05-11 from the original [sunshower.md](sunshower.md) outline)
- ✅ [Vault schema (vault/CLAUDE.md)](../vault/CLAUDE.md)
- ✅ This backlog
- 🧊 Architecture decision record (ADR) folder — if we accumulate enough non-obvious design decisions to warrant it.

## Open questions

- ❓ **Microclimate tagging within Central West.** Coastal CW vs South Bay foothills CW vs inland Diablo Range CW are ecologically distinct. Should this live in a `microclimate:` frontmatter field, in sub-region pages, or be left to body prose? Decide before native plant ingest.
- ❓ **Cultivar vs species handling.** When natives come in, cultivars often have reduced pollinator value. Should each cultivar get its own plant page, or sit as variants under the species page? Depends on how user-facing UI surfaces them.

### Resolved (2026-05-09)

- ~~User-zero workflow~~ → resolved: paste plant-name list (iNaturalist is the offline ID tool) → photo-confirm each entry → generate attack plan. Tracked under **App / UI** above.
- ~~Scrapaholic in active repo~~ → resolved: move to a `scrapaholic-archive` branch, strip from `main`, retire links. Tracked under **Scrapaholic retirement** above.
- ~~Git tracking for `vault/raw/assets/` binaries~~ → resolved: gitignore image binaries (~415 MB total: 140 MB Cal-IPC + 275 MB iNat — easily regenerable via `vault/scripts/fetch_inaturalist_photos.py`), commit everything else including `metadata.json` sidecars (tiny; encode the legally-required attribution + source observation IDs needed for reproducibility and license compliance). Patterns added to `.gitignore`: `vault/raw/assets/**/*.jpg`, `**/*.JPG`, `**/*.jpeg`, `**/*.png` (mixed-case `.jpg`/`.JPG` covers Cal-IPC's case-inconsistent filenames). Same pattern applies to any future asset source. Independent of the eventual Supabase question — when Supabase comes online, photos will likely move to Supabase Storage / S3, not git.
