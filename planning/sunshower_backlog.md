# Sunshower — Backlog

Coarse-grained task tracker for the [Sunshower project](sunshower.md). Domain-level entries, not individual tickets. The goal is multi-agent / multi-session coordination — one place to see what's done, in flight, queued, and blocked.

**Last updated:** 2026-05-12 — WRIC wiki ingest complete (38/38 annotated plants now at `status: draft`); three new cleanup-plan integration tasks (Layers A/B/C) added under App / UI.

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

- 🚧 **User-zero MVP — pick list → confirmed list → attack plan.** Phase 1 entry point. Three steps:
  1. **Input.** ✅ User picks plants identified in their yard from an autocomplete over the 137-plant Cal-IPC DB (search by scientific name, common name, or alias; results show photo thumbs and disambiguate the matched term). iNaturalist is the offline ID tool for this step — not embedded in the app yet. Shipped in PR #4 (Agent A).
  2. **Confirm.** For each pick, app renders photos so the user verifies each entry matches what's actually in their yard. Clicking a photo opens a lightbox with all photos for that plant. Per-row keep/drop.
  3. **Plan.** Generated from the confirmed list: removal sequence ordered by Cal-IPC rating × spread mechanism × season; per-weed method (sheet mulch / solarize / manual / targeted herbicide); CA timing windows; disposal/reinfestation notes; handoff to Phase 2 plant selection.
  - Depends on: iNat photos wired into plant pages (✅ done — see Photo sourcing section), WRIC ingest for management content, Phase-1 management concepts. Can ship with stubbed plan content while those land.
  - Out of scope for MVP: in-app photo recognition, satellite/yard map overlay, multi-yard accounts, login.
  - See [planning/sunshower_gui_mvp.md](sunshower_gui_mvp.md) for the per-agent breakdown of the remaining work.
- 🧊 In-app identification flow — user uploads a photo or describes plant; app does the matching (replaces the offline iNat step in the MVP above).
- 🧊 Plant selection UI — given site conditions, suggest native plants (Phase 2).
- 🧊 Authentication / user yards (one user → many plant inventories per yard).
- 📋 **Three.js landing/hero scene for the garden app entry page.** Stylized native CA flora + pollinator motif (bees, butterflies, hummingbirds) — sets visual identity for the app subdomain and serves as the low-risk place to build three.js muscle before Phase 3 needs it structurally. Constraints: single canvas, lazy-loaded, mobile-friendly, mind LCP/bundle budget. Avoid generic "vibey portfolio" aesthetic — motif should be specifically native-CA / pollinator. Independent of MVP feature work.
- 📋 **Visible-path navigation across the four phases.** Render Cleanup → Selection → Planning → Care as a literal trail (stepping stones / waypoint markers) inside the `/sunshower` three.js scene. Each stop is a clickable hotspot routing to its phase; camera tweens on linear traversal, direct jumps short-circuit to the target. Persistent `<Canvas>` at the route layout so the scene doesn't remount on navigation. Pair with a HUD breadcrumb / chapter-overlay so deep-linked users can jump without learning the metaphor. Reference experience: [persepolis.getty.edu](https://persepolis.getty.edu/) — single-canvas scroll-driven WebGL with chapter overlay. Pattern + inspiration sites in [planning/sunshower/tech-stack.md → Navigation pattern](sunshower/tech-stack.md#navigation-pattern-planned) and [REFERENCES.md](sunshower/REFERENCES.md). Depends on landing-scene canvas work above (shared persistent-canvas plumbing).
- 🧊 **Phase 3 bed layout planner — three.js as the structural rendering layer.** Mature plant footprints, height layering (back-to-front by size), sun/shade overlays, and bloom-succession scrubbing across seasons. This is where 3D earns its weight functionally; the landing scene above is the warm-up. Defer until Phase 1 cleanup workflow is shipped.

### Cleanup-plan rendering — wiring the WRIC/UC IPM data into the user-facing plan (added 2026-05-12)

The MVP's Plan step (#3 above) currently renders one card per plant, with the "method" string derived from `spread_mechanisms` and `removal_notes[]` not rendered at all (see "for now, methods reflect spread mechanism only" comment in [src/app/sunshower/cleanup-plan/plan.ts](../src/app/sunshower/cleanup-plan/plan.ts)). The data we now have in `src/data/plants.json` + the wiki rollout supports a richer two-section output: a top-level yard-wide summary (sequencing, shared cautions, multi-year horizon) followed by per-plant cards grouped by `removal_method` with the WRIC/UC IPM-grounded notes. Three layers, sequenced A → C → B.

- 📋 **Layer A — Wire `removal_method` + `removal_notes[]` into the cleanup-plan render.** Drop the spread-mechanism-derived method string; use `plant.removal_method` directly. Group selected plants by `removal_method` so 3 brooms become one shared action card (per the Agent D design in [planning/sunshower_gui_mvp.md](sunshower_gui_mvp.md)), not three separate ones. Render `plant.removal_notes[]` per plant under each card. Smallest visible win; data already exists in `plants.json` for all 38 annotated plants. **Prerequisite for Layer B.**
- 📋 **Layer B — Top-level cleanup summary above the per-plant cards.** New summary block synthesizing across the user's selections: optimal sequencing window across the yard (e.g., "Cut brooms May–June; dig fennel Feb–March; ivy any cool month; bag everything"), yard-wide cautions triggered by the picked plants (poison-hemlock → PPE + don't-burn; ivy → dermatitis gloves; multiple fragment-spreaders → "bag don't compost as a yard rule"), multi-year follow-up horizon if any selection has a long seedbank (e.g., black mustard 50+ years, brooms decadal), and a tool list derived from the selected methods. May need new schema fields in `plants.json` to drive cleanly: `removal_timing_window`, `requires_followup_years`, `safety_flags[]`. **Depends on Layer A.**
- 📋 **Layer C — Refresh `removal_notes[]` in `plants.json` from the WRIC + UC IPM wiki rollout.** Current `removal_notes[]` (3–5 bullets per plant) pre-date the WRIC ingest — they are the v0 synthesis. The plant wiki pages now contain richer specifics: concrete herbicide dilutions (e.g., triclopyr 61% at 1:4 in water for brooms), timing windows (late summer / early fall foliar glyphosate on blackberry), what-doesn't-work warnings (don't mow Hedera/Vinca/Delairea/Clematis — fragments regenerate). Fold the material content into `removal_notes[]` per plant in a single batch pass across all 38. Already-flagged plants from prior synthesis deltas (pepperweed, Bermuda buttercup, Himalayan blackberry) get priority. Independent of Layer A/B but pairs naturally with Layer A's render.

## Scrapaholic retirement

The `/scrapaholic` project is archived (see [CLAUDE.md](../CLAUDE.md)) but live code, route, and links still ship from `main`. Goal: `main` carries only active project links and code; scrapaholic is preserved on a dedicated branch.

- 📋 Cut a `scrapaholic-archive` branch from `main` at the current state (full code + Prisma schema + `archive/scrapaholic/` planning intact). Push to remote so it's preserved off-branch.
- 📋 On `main`: remove the `/scrapaholic` route, API handlers, lib modules, and Prisma models that are scrapaholic-only. Strip any nav/landing-page links pointing at scrapaholic so the live site shows only active projects.
- 📋 Decide what happens to the `scrapaholic.lucttang.dev` subdomain after main no longer serves it: take it down, redirect to a static archive notice, or point it at the archive branch's deploy. Note the decision in [CLAUDE.md](../CLAUDE.md).
- 📋 Update [CLAUDE.md](../CLAUDE.md) "Archived" section once retirement lands — current note assumes the live route still serves traffic.

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
