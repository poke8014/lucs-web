# Sunshower — Backlog

Coarse-grained task tracker for the [Sunshower project](sunshower.md). Domain-level entries, not individual tickets. The goal is multi-agent / multi-session coordination — one place to see what's in flight, queued, and blocked.

**Completed work lives in [sunshower_backlog_archive.md](sunshower_backlog_archive.md)** — this file carries only 🚧 / 📋 / 🧊 / ❓ so it stays scannable for current-phase tasking. The archive also holds the full historical "Last updated" changelog.

**Current state (2026-05-18):** **Phase 1 (Cleanup) closed** on `feat/close-phase-1` — cleanup-plan Sections 2–3 shipped (prep + Phase-2 handoff), so the three-step User-zero MVP (Input → Confirm → Plan) is complete; this backlog was also split, completed work → [sunshower_backlog_archive.md](sunshower_backlog_archive.md). Calscape native-plant ingest merged earlier (PR #19) — 150 SJ/Bay Area `nativity: native` stub pages; **Phase-2 data layer is live**. Next up is the Phase-2 sequence under *Native plant ingest*: Calscape enrichment scrape → Phase-2 selector design. Remaining Phase-1 work is polish only (friendly-to-natives copy pass, picker-scope de-emphasis). Prior milestones: see the archive changelog.

## Conventions

| Status | Meaning |
|--------|---------|
| 🚧 | In progress — name the owner (agent / person) and what they're doing |
| 📋 | Up next — ready to pick up |
| 🧊 | Icebox — future / low priority / not yet shaped |
| ❓ | Blocked or open question — note what's blocking |
| ✅ | Done — moved to [sunshower_backlog_archive.md](sunshower_backlog_archive.md) (with completion date) |

**When picking up a task:** change 📋 → 🚧 and add owner.
**When finishing:** change 🚧 → ✅, add the date, and move the line to the matching section in [sunshower_backlog_archive.md](sunshower_backlog_archive.md). Keep this file free of standalone ✅ items (the one exception: ✅ sub-steps inside an in-flight 🚧 composite, where they give necessary structure).
**When adding a task:** append at the bottom of its domain section. Update **Current state** at the top.

Backlog ≠ wiki log. Wiki operations (ingests, refactors, queries) are logged in [vault/log.md](../vault/log.md) — that's the chronological record of what was filed in the wiki. This backlog is the project plan: what we've decided to do, what's in flight, what's queued.

---

## Cal-IPC data ingest

The California Invasive Plant Council Inventory — see [vault/sources/calipc.md](../vault/sources/calipc.md). Top-tier scrape + wiki ingest + WRIC management layer + photos are done (→ archive).

- 📋 WRIC scrape — broader passes as needed (remaining 267 PDFs in the archive). Recipe in `vault/raw/pdfs/wric/_index.md`. Pull on demand once Cal-IPC tier expands or specific species come up.
- 📋 Cal-IPC Limited tier scrape + ingest (~89 additional plants × 2 docs).
- 📋 Cal-IPC Watch tier scrape + ingest (~105 PRE pages — *different schema* from PAF; will need a separate parser pass).
- 📋 Cal-IPC Species ID Cards — separate PDF asset on Cal-IPC for a subset of plants. Designed for visual yard identification; high-value for user-facing app.

## Photo sourcing (display-tier)

Two-tier strategy: **research photos** (already in `vault/raw/assets/calipc/` from Cal-IPC — high botanical quality, but unclear redistribution rights) stay in the wiki for reference and never reach end users. **Display photos** (permissively-licensed, app-facing) are pulled separately from sources with explicit commercial-use OK and stored alongside attribution metadata. iNat pull + page-wiring + top-up are done (→ archive).

- 📋 Wikimedia Commons fallback — for plants where iNat top-up still leaves gaps (genuine CC photographer scarcity). Wikimedia tends to have consistently clean licensing and good botanical reference shots; smaller but complementary coverage to iNat.
- 🧊 Photo attribution UI surface — when users see a photo in the app, the photographer name + license needs to render. Out of scope until UI work begins; flagging now so the data layer captures attribution from the start (already captured in iNat `metadata.json`).

## Common weed ingest (UC IPM Residential Pest Notes)

Project-level scope expansion (2026-05-14): cleanup-plan covers **plants gardeners want out of their yard**, not just Cal-IPC-rated invasives. The average gardener doesn't sort by invasive vs. not. See [vault/sources/ucipm-residential.md](../vault/sources/ucipm-residential.md) for the dataset meta-page. Scrape + full wiki ingest + `plants.json` sync + photos are done (→ archive).

- 🧊 **Cross-cutting concepts page: "disturbed-soil weeds — what they're telling you"** — Russian thistle, puncturevine, knotweed, kikuyugrass, dyer's woad, dodder all have UC IPM management notes that point to upstream soil conditions (compaction, bare disturbed soil) as the fix. Pattern noted in the 2026-05-14 rollout log; promote to a concepts page when a few more plants accumulate.
- 📋 **UC IPM Weed Gallery — close the common-garden-weed gap** (raised 2026-05-17, query thread w/ Luc). The 28 Residential Pest Notes are *deep* but *narrow*; common garden/lawn weeds Luc actually finds — prickly lettuce (*Lactuca serriola*), California burclover (*Medicago polymorpha*), hedge mustard (*Sisymbrium officinale*), hawksbeard (*Crepis* spp.), sowthistle, filaree — have **no plant page**. Cal-IPC misses them by design (wildland-only); the Pest Note set didn't include them. **Primary target: the UC IPM Weed Gallery** (`ipm.ucanr.edu/PMG/WEEDS/<slug>.html`) — a separate, broader (~200 weed) photo-driven ID + quick-control DB; the breadth complement to the Pest Notes' depth. Same UC ANR pedigree → [[sources/ucipm-residential]] conventions (citation pattern, `nativity: invasive` minus the Cal-IPC block) extend unchanged. Scrape path **already proven**: the gallery URL pattern is directly observed in our scraped raw (e.g. `california_burclover.html`, `little_mallow.html`, `broadleaf_plantain.html` linked from `ucipm-residential/clovers.md`) and [`vault/scripts/scrape_ucipm.py`](../vault/scripts/scrape_ucipm.py) already renders `ipm.ucanr.edu` cleanly via firecrawl — likely a small extension, not new infra. Pages land `stub`/`draft` (gallery entries are lighter than Pest Notes — correct granularity for minor weeds). **RPRP scoping discipline (mirror Calscape):** "common garden weeds" is unbounded — scope to South Bay / Santa Clara County, *not* the whole ~200. Build the candidate list from Calflora's county weed filter + Luc's named weeds; do not ingest statewide. Sub-items:
  - 🧊 **WRIC backlog is the cheapest partial win — ingest, not scrape.** ~250 WRIC reports already converted to markdown in [`vault/raw/articles/wric/`](../vault/raw/articles/wric/) (incl. `Lactuca.md`, `Medicago.md`, `Sisymbrium_altissimum-irio.md`); for these the gap is *ingest*, covered by the existing "WRIC scrape — broader passes" item above. Caveat: WRIC is the *natural-area* (DiTomaso) management tier — acre-scale, wildland-skewed, wrong audience for a homeowner per [[sources/ucipm-residential]]'s own framing. Use as the removal layer *behind* a UC IPM Weed Gallery ID layer, not the primary garden-weed source. *Crepis* (hawksbeard) is absent from WRIC too — needs the gallery scrape.
  - 🧊 **Calflora for prioritization, not content** — folds into the existing `🧊 Calflora / Jepson Interchange` item under *Native plant ingest*. Calflora's Santa Clara County occurrence filter answers *which* weeds are actually in Luc's area (the region-scoping input above); it is range/occurrence data, not ID-and-removal narrative, so it scopes the gallery scrape rather than substituting for it. CDFA Encycloweedia (regulatory noxious weeds) is too narrow for the garden-weed gap — not pursued.

## Native plant ingest

The "what to plant instead" half of [[concepts/right-plant-right-place]] — Phase 2 plant selection. Full Calscape SJ/Bay Area rollout (150 taxa) merged via PR #19 (→ archive); the two items below are the live Phase-2 sequence.

- 📋 **Calscape enrichment scrape** — per-species page-scrape for the two fields the export omits: full editorial "About" prose + *named* butterfly/moth host species (export gives only a count). Upgrades the 150 pages `stub→draft` and seeds `host_plant_for` + the Pollinators index. ~150 firecrawl scrapes; recipe/format in [[sources/calscape]].
- 📋 **Phase-2 selector design** (model from Luc, 2026-05-17 — captured in [[sources/calscape]] "Phase-2 selector model"). Selection = location-scoped + garden-type-by-ecology (`native.communities`) + garden-goal facets (water-efficient / pollinator / bird / low-maintenance — all now in frontmatter) + user-suggests-own-plants (cleanup-plan picker pattern) + companion pairing (`native.companions` graph) + digestible small batches (progressive disclosure, not a 150-item dump). Data layer ready; this is the App/UI build, sequenced after the enrichment scrape.
- 🧊 Calflora / Jepson Interchange — secondary native plant data sources.
- 🧊 Bloom-time data — Calscape export carries `Flowering Season` (now in `bloom_season` frontmatter); cross-check vs Jepson when bloom-succession planning starts.

## Schema / wiki maintenance

Frontmatter namespace + dataset/source conventions are defined (→ archive).

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

The **User-zero MVP** (Phase 1 cleanup-plan: Input → Confirm → Plan, incl. Layers A/B/C + Sections 2–3) shipped 2026-05-18 → archive. Items below are Phase-1 polish + later-phase / cross-cutting UI.

- 📋 **Picker scope — de-emphasize non-residential invasives in autocomplete (added 2026-05-15).** The 98 Cal-IPC plants without a `removal_method` are all aquatic, salt-marsh, coastal-dune, or remote-rangeland species — explicitly "outside the residential cleanup-plan scope" per [vault/index.md](../vault/index.md), but currently rank equally with residential weeds in [src/app/sunshower/cleanup-plan/PlantPicker.tsx](../src/app/sunshower/cleanup-plan/PlantPicker.tsx) autocomplete. Approach: keep them findable but visually de-emphasized in default results (greyed thumb / muted text), and add an "Include rare invasives" advanced-search toggle that promotes them back to equal ranking. Likely needs a derived `residential_scope` field on each plant in `src/data/plants.json` (or for now, compute from `removal_method !== null`) so the picker can tier without re-deriving each keystroke. Pairs with the friendly-to-natives copy pass below — non-residential invasives shouldn't ride the same urgency framing as residential weeds.
- 🧊 In-app identification flow — user uploads a photo or describes plant; app does the matching (replaces the offline iNat step in the MVP above).
- 🧊 Plant selection UI — given site conditions, suggest native plants (Phase 2).
- 🧊 **Plan enrichment — post-DB (migrated from the GUI-MVP *Deferred* list, 2026-05-16).** Deferred until the plant DB carries the needed fields; this is what the "Coming next" placeholder (Cleanup-plan rendering §3) fills in from: CA planting-window timing (zone-based), soil-prep recommendations (per plant / per region), best-time-to-mulch (per region), 3-tier native classification (native / benign / invasive) surfaced in the plan, site-context inputs beyond yard state (sun / soil type / region / water), and iNat API import (username/URL → fetched observations). Related items already tracked separately: the Phase-2 plant-selection bridge → "Plant selection UI" above; native-data ingest → *Native plant ingest*; in-app photo ID → "In-app identification flow" above.
- 🧊 Authentication / user yards (one user → many plant inventories per yard).
- 🚧 **Three.js landing/hero scene for the garden app entry page.** Persistent canvas + Phase-1-themed scene (rain / sun / weed tufts / shovel hotspot) shipped in commit `35d4422` — [src/app/sunshower/Scene.tsx](../src/app/sunshower/Scene.tsx) renders at the route layout so it doesn't remount on navigation. Responsive pass shipped in PR #16 (2026-05-16): desktop keeps the immersive fixed scene; mobile becomes a scrollable document with the 3D shovel as an in-flow stage; a new `backdrop` Scene variant ([SceneBackdrop.tsx](../src/app/sunshower/SceneBackdrop.tsx)) keeps ambient sun/rain/ground continuous across the breakpoint (no atmosphere pop), with fluid `clamp()` type and a clickable "cleanup plan" pill. Remaining: stylized native CA flora + pollinator motif (bees, butterflies, hummingbirds) — current scene is cleanup-flavored, not yet the broader pollinator visual identity. Constraints: single canvas, lazy-loaded, mobile-friendly, mind LCP/bundle budget. Avoid generic "vibey portfolio" aesthetic.
- 📋 **Visible-path navigation across the four phases.** Render Cleanup → Selection → Planning → Care as a literal trail (stepping stones / waypoint markers) inside the `/sunshower` three.js scene. Each stop is a clickable hotspot routing to its phase; camera tweens on linear traversal, direct jumps short-circuit to the target. Persistent-canvas plumbing already landed (above); shovel currently routes to cleanup — pattern proven. Pair with a HUD breadcrumb / chapter-overlay so deep-linked users can jump without learning the metaphor. Reference experience: [persepolis.getty.edu](https://persepolis.getty.edu/). Pattern + inspiration sites in [planning/sunshower/tech-stack.md → Navigation pattern](sunshower/tech-stack.md#navigation-pattern-planned) and [REFERENCES.md](sunshower/REFERENCES.md).
- 🧊 **Phase 3 bed layout planner — three.js as the structural rendering layer.** Mature plant footprints, height layering (back-to-front by size), sun/shade overlays, and bloom-succession scrubbing across seasons. This is where 3D earns its weight functionally; the landing scene above is the warm-up. Defer until Phase 1 cleanup workflow is shipped.

### Beginner-gardening ideas (added 2026-05-15)

Surfaced from the 4-article beginner-gardening ingest — see [planning/sunshower/CONTEXT.md → Ideas surfaced from beginner-gardening ingest](sunshower/CONTEXT.md#ideas-surfaced-from-beginner-gardening-ingest-2026-05-15) for the narrative rationale. The homepage yard-state router shipped (PR #16 → archive).

- 📋 **In-app site-inventory walkthrough.** Expose [vault/concepts/site-inventory.md](../vault/concepts/site-inventory.md) as a guided in-app flow — sketch upload or canvas, aspect (compass-app prompt), sun map (hourly-photo prompt → 5-tier zoning), wind, slope, utilities, sightlines. Reusable from any phase route since selection and care both depend on it. Sits between cleanup and selection in the linear traversal. **Soil/pH indicator-plant prompt slots in here** — *"see any rhodos or lavenders nearby?"* as the low-friction first-pass acid/alkaline read, before any test-kit step. Idea source: [vault/sources/gardenersworld-soil-ph.md](../vault/sources/gardenersworld-soil-ph.md) + [vault/sources/summerwinds-sun-exposure.md](../vault/sources/summerwinds-sun-exposure.md).
- 🧊 **Parallel-tracks UX — passive mapping + active in-yard removal.** Keep both kinds of tasks live at once: a user can map their landscape at the kitchen table or phone-in-hand at the window while actively pulling weeds outside. Concretely: a "what to do indoors today" vs. "what to do outdoors today" split in the cleanup-plan + site-inventory checklists, or a unified task list with venue tags. Cardboard / black-plastic suppression of un-worked beds (see [vault/concepts/planting-technique.md](../vault/concepts/planting-technique.md)) is the bridge — passive suppression runs while the user works elsewhere. Shape this further when the homepage router + site-inventory walkthrough land.
- 📋 **Copy pass — friendly-to-natives, not aggressive-to-weeds.** Lean cleanup-plan + landing copy toward *supporting native plants and pollinators* rather than *destroying invasives*. The plant-classification distinction (Cal-IPC invasive vs. common residential weed vs. native) is the lever — common weeds shouldn't carry the same urgency-language as Cal-IPC High invasives. Affects [src/app/sunshower/cleanup-plan/page.tsx](../src/app/sunshower/cleanup-plan/page.tsx) section headings, `SummaryCard` labels, and the landing page copy. Reference: [vault/concepts/wildlife-coexistence.md](../vault/concepts/wildlife-coexistence.md).
- 📋 **Phase 4 (Care) — wiki + app content gap.** Empty Care phase today + no in-app destination for users with established yards. Two parallel tracks: **(a) wiki** — ingest a CA-native care source (watering for natives, feeding caveats, pruning timing including pollinator-overwintering, mulch timing); the generic care content in [vault/concepts/watering.md](../vault/concepts/watering.md), [vault/concepts/composting.md](../vault/concepts/composting.md), and [vault/concepts/pruning.md](../vault/concepts/pruning.md) all carry "may not apply to CA natives" caveats currently. **(b) app** — Phase 4 landing destination, even if just a "coming soon + interim links to existing wiki pages." Homepage yard-state router will surface this gap fast once it ships (an "established" answer has nowhere to go today).

## Scrapaholic retirement

The `/scrapaholic` project is archived. `main` carries only active project links and code; scrapaholic is preserved on the `archive/scrapaholic` branch. Branch cut + code removal + CLAUDE.md cleanup are done (→ archive).

- 📋 **`scrapaholic.lucttang.dev` subdomain decision** — DNS still points at the old route. Options: take down in Vercel, redirect to a static archive notice, or point at the archive branch's deploy. Followups in commit `dd33e86` message also include dropping `products` / `certification_cache` / `scrape_cache` / `brand_reputation` tables in Postgres and removing `SCRAPAHOLIC_PASSWORD` / `FIRECRAWL_API_KEY` / `GEMINI_API_KEY` / `APIFY_API_TOKEN` env vars in Vercel.

## Tooling

Scripts live in [.firecrawl/](../.firecrawl/) for now (gitignored — promote to `ops/` if they become long-lived). Scrape pipeline + page generator + stats + iNat fetcher are done (→ archive).

- 📋 Promote Cal-IPC ingest scripts to `ops/calipc-ingest/` once stable and re-runnable (e.g., when WRIC content lets us regenerate plant pages with richer body content). Note inconsistency: iNat fetcher lives at `vault/scripts/` (committed), Cal-IPC scripts at `.firecrawl/` (gitignored) — pick one home when promoting.
- 🧊 Equivalent scripts for Calscape / WRIC ingests when those sources are tackled.

## Documentation

[Project home](sunshower/), [vault schema](../vault/CLAUDE.md), and this backlog are established (→ archive). Completed work is now split into [sunshower_backlog_archive.md](sunshower_backlog_archive.md).

- 🧊 Architecture decision record (ADR) folder — if we accumulate enough non-obvious design decisions to warrant it.

## Open questions

- ❓ **Microclimate tagging within Central West.** Coastal CW vs South Bay foothills CW vs inland Diablo Range CW are ecologically distinct. Should this live in a `microclimate:` frontmatter field, in sub-region pages, or be left to body prose? *(The Calscape `native:` block introduced `native.communities`/`sunset_zones` — likely the de-facto resolution; confirm and close, or restate what's still open.)*
- ❓ **Cultivar vs species handling.** When natives come in, cultivars often have reduced pollinator value. Should each cultivar get its own plant page, or sit as variants under the species page? *(Calscape rollout note claims the `native:` block + `is_cultivar` resolves this — confirm against the shipped data and close if so.)*
