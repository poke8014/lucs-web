# Sunshower — Phase 3 Bed Layout Planner (build spec)

> **Status: SPEC (2026-07-05), unowned.** Written for future agents, modeled on [sunshower_site_inventory_mvp.md](sunshower_site_inventory_mvp.md) (spec → build record). Decisions marked **⚠️ proposed** need Luc's sign-off before the affected unit is dispatched; everything else traces to committed direction, shipped code, or vault sources. Follow the **start-task** skill before picking up a work unit, and update this doc as units ship.

**User-facing goal:** a user who has finished (or partially finished) the site-inventory walkthrough turns their yard into a plan they can actually execute: a base map divided by paths into named sections, each section labeled with its conditions, assigned a density style and a build season, and filled with placed native plants — with quantities, a design checker that keeps the result looking intentional, and a season scrubber + grown-in view that shows what they're building toward. Plans are cheap to fork and revise; nothing is ever "finalized."

This is the surface where the project's positioning lives: **the overlap of garden design and native-plant knowledge** — every screen carries just enough design guidance that the output reads as intentional, not messy ("beautiful *and* alive", Luc 2026-07-03).

---

## Where this sits — current state and the unmerged direction branch

### Shipped (main, as of 2026-07-05)

- **`/sunshower/site-inventory`** — 8-step walkthrough producing a versioned localStorage `SiteProfile` ([src/app/sunshower/site-inventory/types.ts](../src/app/sunshower/site-inventory/types.ts), key `sunshower.siteProfile.v1`). Sun zones are a **labeled list, no geometry** — the walkthrough spec explicitly deferred all drawing to Phase 3 ("zone-painting canvas (Phase-3 bed planner)"). This spec is that deferral coming due.
- **`/sunshower/cleanup-plan`** — Phase 1 MVP; its `PlantPicker.tsx` is the proven plant-search pattern.
- **`/sunshower`** — yard-state router + persistent three.js scene ([Scene.tsx](../src/app/sunshower/Scene.tsx)); react-three-fiber stack already in the bundle, lazy-loaded.
- **`src/data/plants.json`** — derived from vault frontmatter by [ops/build-plant-data.mjs](../ops/build-plant-data.mjs). **Currently stale and shape-incomplete for this feature** — see §Data-layer prerequisites.
- **Vitest** (`npm test`) — pure-logic modules get colocated `*.test.ts`; UI verification stays manual.

### The unmerged direction branch — read this before building

Branch **`docs/phase-specs`** (5 commits, unmerged as of 2026-07-05, checked out in a second worktree) holds the planning-flow direction Luc set 2026-07-03: the M0–M7 milestone spine, the density/sectioning/saved-plans direction, the user-data model sketch, and four concept pages this spec cites. It diverged **before** the site-inventory walkthrough and Post-Wild World ingest merged, so it conflicts textually with main's planning docs — its M1/M2 rows ("yard base map" + "site-inventory editor", spec'd as a computed-sun living inventory) were partly overtaken by the lighter walkthrough that actually shipped.

**This spec restates everything it depends on so it stands alone on main.** Where it cites branch-only files, they're marked *(on `docs/phase-specs`, unmerged)*. In milestone-spine terms, this spec absorbs:

| Spine milestone | What this spec takes |
|---|---|
| M1 — yard base map | The whole thing: trace/upload + scale calibration + obstruction outlines. The planner is the canvas M1 was waiting for. |
| M3 — paths, zones & phase order | The whole thing: paths-first decomposition, sectioning, per-section phase state, density style. This is the planner's core. |
| M5 — bloom calendar | Only the season scrubber + bloom-gap check; the full month-by-month forage calendar stays future. |
| M6 — quantities & sourcing | Only the per-section estimate (area ÷ spacing at density → plant count); nursery finder / garden recipes stay future. |
| Cross-cutting | The **plan checker** (heuristic flags, never auto-layout). |
| M2 — living inventory (computed sun, per-datum confidence) | **Not absorbed.** Sun stays user-labeled (from the SiteProfile). The suncalc shade-simulation idea rides behind its unproven S0 feasibility spike — see §Explicitly deferred. |
| M7 — saved plans w/ auth | Not absorbed, but the data contract is shaped for it (users → yards → sections → section_plants). |

### Committed direction this spec builds on

- **Density style — landscaped vs. naturalistic** (Luc 2026-07-03). User picks the look before the planner does spacing math. Landscaped = mature radius + clearance ([vault/concepts/plant-spacing.md](../vault/concepts/plant-spacing.md)); naturalistic = drifts + matrix overlap. Density × sectioning is the manageability lever: area ÷ spacing at density → plant count → cost/effort.
- **Section-by-section rollout** (Luc 2026-07-03). Sections are the execution units; each moves through cleanup → prep → plant on its own timeline while cardboard suppression holds the rest ([vault/concepts/planting-technique.md](../vault/concepts/planting-technique.md); `phased-planting.md` *(on `docs/phase-specs`, unmerged)*: "only clear as much yard as you have plants for").
- **Checker, not generator.** The community's layout heuristics are encodable as flags ("nothing blooms in fall · 5-ft plant fronting a 1-ft plant"), never as an auto-layout. Plans are disposable; the human keeps the fun part.
- **Cheap iteration** ([vault/concepts/bubble-drawing.md](../vault/concepts/bubble-drawing.md)): 5–20 drafts per project is normal; duplicating a plan must be one tap; "a plan that took one sketch is a plan that wasn't iterated." Never force finalization ([sunshower/CONTEXT.md → What to avoid](sunshower/CONTEXT.md)).
- **The four-layer model** ([vault/concepts/planting-layers.md](../vault/concepts/planting-layers.md)): structural 10–15% / seasonal theme 25–40% / ground cover ~50% / filler 5–10%. "Legibility in the design layers, diversity in the functional layers." This is the planner's central data-model idea — see below.
- **Three.js earns its weight here** (backlog item, Luc): mature footprints, height layering, sun/shade overlays, bloom-succession scrubbing. Resolved into a 2D-edit / 3D-view split — see Scope decisions.

---

## Scope decisions

### ⚠️ Proposed (needs Luc's sign-off — reshapes everything downstream)

1. **Edit in 2D top-down; experience in 3D.** The working surface — base map, paths, sections, placement — is a 2D SVG/canvas editor. The three.js layer is a read-only **grown-in view**: height layering, seasonal state, and sightline checks that a flat plan genuinely can't show. Rationale: (a) precision placement in 3D is a hard interaction problem with no payoff — every reference workflow (bubble drawing, GIS screenshots, graph paper) is top-down; (b) the M1+M2 spec already took "2D top-down, not three.js" for the map for LCP/bundle reasons *(on `docs/phase-specs`, unmerged)*; (c) matrix planting makes mature-size circles overlap *by design*, so even 2D circle-drawing "breaks down" for the functional layers (`planting-design-heuristics.md`, unmerged) — the fix is the placement model below, not a 3D editor. The backlog's "3D as the structural rendering layer" is honored as the grown-in view (unit H), where 3D is functional, not decorative.
2. **Placement kinds mirror the four layers.** Three ways plant meets ground, so the planner never asks anyone to position 300 groundcover plugs:
   - `individual` — one plant, one point. For structural/framework plants (placed carefully, fewest in number).
   - `drift` — one species, a small polygon, a count (3/5/7). For seasonal-theme plants (bold sweeps, exact position doesn't matter).
   - `matrixFill` — a species *mix* assigned to a region at a spacing; quantities computed, positions never drawn. For ground-cover + filler layers ("place a population, not individuals").
   This is the load-bearing modeling decision: it makes naturalistic density representable without the overlapping-circle chaos, and it makes the 50%-ground-cover check computable.

### Locked by direction or evidence (build to these)

- **Sun/conditions come from the user's labels, not simulation.** Sections link to the SiteProfile's `sunZones` (5-tier vocabulary) and inherit their tier; the user confirms per section. The computed-sun engine (suncalc + shadow projection) stays deferred behind its S0 spike — the planner's data model just leaves room for a `source: 'stated' | 'observed'` upgrade later.
- **Base map is zero-key, zero-cost.** User-uploaded satellite/GIS screenshot with scale calibration (draw a line over a known length), or a plain drawn rectangle + dimensions. No map-API dependency, no address geocoding. Matches observed gardener behavior (county-GIS screenshots are the community's de-facto base map).
- **Persistence: IndexedDB via a thin wrapper, versioned, with JSON export/import.** localStorage stays for the `SiteProfile` (don't touch it), but plans carry geometry + an optional base-map image and support **multiple named drafts with one-tap forking** — that blows the ~5MB localStorage budget the walkthrough spec worked within. Schema versioned like the SiteProfile (`version: 1`), shaped to serialize into the future Supabase user tables (users → yards → sections → section_plants, sketch in `tech-stack.md → User data` *(on `docs/phase-specs`, unmerged)*). Export/import JSON is the durability valve until auth (M7).
- **The SiteProfile is read-only input.** The planner reads it through the existing [profile.ts](../src/app/sunshower/site-inventory/profile.ts) loader and references zone `id`s; it never writes back. One-way flow, no sync. (A future living-inventory editor may unify them; that's the M2 seam, not this build.)
- **Palette is an interim picker, not the Phase-2 selector.** The selector (companion pairing, progressive disclosure, small batches) is sequenced after the Calscape enrichment scrape and is **not** a dependency here. The planner ships a thin palette: search over the natives in `plants.json` (PlantPicker pattern), filtered by the active section's sun/water/soil labels, plus **plant-first entry** — type a plant you've fallen for, get a fit read against the section you're pointing at (Luc 2026-07-03: first-class on-ramp, guidance never a gate). Define the palette as one interface seam (`section labels in → ranked plant list out`) so the real selector slots in without touching the canvas code.
- **Bloom scrubbing is season-granular** (winter/spring/summer/fall) because `bloom_season:` is season-granular. No month slider pretending to month-level data.
- **Desktop/tablet-first for editing; mobile gets read + in-yard reference.** Opposite call from the walkthrough (phone-in-the-yard) and same call as the M1+M2 spec's session-1: tracing and placement are sit-down work. The mobile pass is: open a plan, see the section list + per-section plant lists + statuses, usable at the nursery and in the yard.
- **Route: `/sunshower/bed-planner`.** Server `page.tsx` wrapper (metadata) around a client editor, same structure as site-inventory. Three.js view is dynamically imported, never SSR'd, and cannot regress the `/sunshower` landing LCP budget.
- **Copy tone: friendly-to-natives**, "plans always change and gardens are never finished" as the emotional register. Checker findings are invitations ("fall looks quiet — want something blooming then?"), never scolds. No urgency language.

## Anti-goals

- **No auto-layout generator.** The checker flags; the human places. (Committed direction.)
- **No auth, no cloud persistence, no multi-yard.** One yard, many plan drafts, one device; export/import bridges the gap until Supabase/M7.
- **No computed sun/shade simulation** in this build (S0 spike unproven — see Deferred).
- **No satellite imagery fetching** — upload only.
- **No plant recommendations engine** — the palette filters and ranks what's in `plants.json`; the nudge-toward-natives / companion UX belongs to the Phase-2 selector.
- **No slope/terrain modeling** — flat-plane assumption in both 2D and 3D; `waterSlope.grade` renders as a badge and a checker input, not geometry.
- **No cost database** — the estimate is plant counts × a user-editable unit price (sensible defaults per container size), clearly labeled as rough.
- **No new vault taxonomy** — this build consumes vault data; it doesn't create pages.

---

## Data contract

Lives in `src/app/sunshower/bed-planner/types.ts`. Verbatim unless a real problem surfaces at build time; deviations get noted in this doc like the walkthrough's did. `SunTier`, `Cardinal` import from the site-inventory types — one vocabulary.

```ts
import type { SunTier } from '../site-inventory/types'

type LayerRole = 'structural' | 'seasonal' | 'groundcover' | 'filler'
// vault/concepts/planting-layers — target shares of total plant quantity:
// structural 10–15%, seasonal 25–40%, groundcover ~50%, filler 5–10%

type Point = { x: number; y: number }        // feet, base-map space, y-down
type Polygon = Point[]                        // closed, non-self-intersecting

interface Obstruction {
  id: string
  kind: 'building' | 'fence' | 'tree' | 'other'
  footprint: Polygon
  heightFt?: number          // story presets: 1 ≈ 12 ft, 2 ≈ 22 ft; free override
  deciduous?: boolean        // trees only; matters when computed shade lands
}

interface BaseMap {
  widthFt: number
  heightFt: number
  imageKey?: string          // IndexedDB blob key — satellite/GIS screenshot or photographed paper sketch
  imageOpacity?: number
  pxPerFt?: number           // set by scale calibration when an image exists
  northBearingDeg?: number   // seeded from SiteProfile.aspect, editable
  boundary?: Polygon         // yard outline; defaults to the full rectangle
  obstructions: Obstruction[]
}

interface PathFeature {
  id: string
  polyline: Point[]
  widthFt: number            // default 3
  surface?: 'mulch' | 'gravel' | 'paver' | 'stepping_stones' | 'existing'
}

type PhaseState = 'untouched' | 'cleanup' | 'prepped' | 'planted' | 'established'

interface Section {
  id: string
  name: string               // "back fence bed"
  polygon: Polygon
  sunZoneId?: string         // SiteProfile.sunZones[].id — read-only bridge
  labels: {
    sun?: SunTier            // seeded from the linked zone, user-confirmed
    moisture?: 'dry' | 'average' | 'wet'      // seeded from waterSlope.poolingSpots prompts
    soilTexture?: 'sandy' | 'loamy' | 'clay' | 'unsure'   // seeded from SiteProfile.soil
  }
  densityStyle?: 'landscaped' | 'naturalistic'   // per section, not per plan (Luc 2026-07-03)
  phaseState: PhaseState
  plannedSeason?: string     // "fall 2026" — CA planting window is roughly Sep–Nov
  holdMethod?: 'cardboard' | 'mulch' | 'none'    // suppression while a section waits
}

type Placement =
  | { kind: 'individual'; id: string; sectionId: string; plantSlug: string
      layerRole: LayerRole; center: Point }
  | { kind: 'drift';      id: string; sectionId: string; plantSlug: string
      layerRole: LayerRole; area: Polygon; count: number }   // nudge to 3/5/7
  | { kind: 'matrixFill'; id: string; sectionId: string
      layerRole: LayerRole                                    // groundcover or filler
      mix: { plantSlug: string; sharePct: number }[]
      spacingIn: number }                                     // default 12–18" centers
// Quantities are always derivable: individual = 1; drift = count;
// matrixFill = sectionArea(covered) ÷ (spacingIn grid) × sharePct.

interface Annotation {                 // knowns worth drawing that aren't plants
  id: string
  kind: 'wet_spot' | 'utility' | 'keeper_plant' | 'hose_bib' | 'note'
  geometry: Point | Polygon
  note?: string
}

interface GardenPlan {
  version: 1
  id: string
  name: string               // "v3 — moved the path south"
  createdAt: string
  updatedAt: string
  forkedFrom?: string        // one-tap duplication is first-class (bubble-drawing)
  baseMap: BaseMap
  paths: PathFeature[]
  sections: Section[]
  placements: Placement[]
  annotations: Annotation[]
}
```

**Storage:** IndexedDB database `sunshower`, object stores `plans` (JSON documents keyed by `id`) and `blobs` (base-map images). Thin promise wrapper, no dependency heavier than ~1KB (hand-rolled or `idb-keyval`-class). All reads/writes behind one client hook (`useGardenPlans`) with the same hydrate-after-mount, debounced-write, SSR-safe discipline as `useSiteProfile`. Corrupt/quota errors fall back to in-memory with a visible "not saving" notice. JSON export = the `GardenPlan` document (image omitted or inlined base64 at the user's choice); import validates `version`.

**Supabase mapping (later, M7):** `GardenPlan` → `yards`+`plans`; `Section` → `sections` rows (phase state, density style, labels, area); placements → `section_plants`; the outcome log (thrived/struggled/died/moved) attaches to `section_plants` rows when accounts land. Nothing here should need a redesign — only a serializer.

---

## Data-layer prerequisites (unit C — do this first or in parallel)

Findings from reading the shipped data layer (2026-07-05):

1. **`plants.json` is stale.** It holds 159 records (158 invasive + 1 native); the 150 Calscape natives shipped in vault frontmatter 2026-05-17 but the file was never regenerated (HANDOFF invariant 3 says regenerate on frontmatter change). [build-plant-data.mjs](../ops/build-plant-data.mjs) reads all of `vault/plants/` with no filter, so regeneration alone brings the natives in — **but flag this in the PR**, because it changes the cleanup-plan picker's autocomplete pool (mostly for the better: "I have this plant" → it's native, keep it — and there's an existing 📋 backlog item on picker tiering to pair with).
2. **The build script doesn't emit what the planner needs.** Extend `buildEntry()` to add: `bloom_season`, `pollinators`, `soil`, `sociability` (schema field exists, currently unset everywhere), and from the `native:` block: `communities`, `communities_simplified`, `companions`, `sun_range`, `water_range`, `soil_drainage`, `ease_of_care`, `nursery_availability`, `is_cultivar`.
3. **Mature sizes are string ranges on native pages** (`height_ft: "13 - 39"`, `width_ft: "40"`). Parse to numeric `{ min, max }` in the build script (emit e.g. `height_ft_min/max`, `width_ft_min/max`; keep the raw string too). Spacing math uses **max width** — plan for the mature plant, not the nursery pot ([vault/concepts/plant-spacing.md](../vault/concepts/plant-spacing.md)). Unit-test the parser against the real vault corpus (expect oddities; the Calscape rollout hit format surprises before).
4. **`sociability` is unset on all 150 natives** (scale defined in [vault/concepts/plant-sociability.md](../vault/concepts/plant-sociability.md); no CA-native values source yet). The planner must not block on it: derive a **low-confidence default layer role + grouping hint** from `plant_type` + max height + `communities` (e.g. tree/large shrub → structural; grass/groundcover → matrix candidates; mid-height perennial → seasonal drifts), surfaced as a suggestion the user can override. When a sociability source lands, the hint upgrades in place.

### Spacing & quantity math (pure functions, unit-tested)

- **Landscaped:** per-plant footprint circle at `width_ft_max / 2` radius + 1 ft clearance (foliage shouldn't touch); foundation rule: ≥ 2 ft mature-foliage-to-wall ideal, 1 ft minimum → trunk-to-wall = radius + clearance. Drift count = drift area ÷ footprint area, rounded to the nearest odd number.
- **Naturalistic:** container size does *not* change spacing; density comes from stacking layers, not cramming one layer. Design layers spaced by their own mature size; `matrixFill` at 12–18" centers underneath and between. Layer-share targets: structural 10–15% / seasonal 25–40% / groundcover ~50% / filler 5–10% of total quantity.
- **Per-section estimate:** total plant count by layer and container size → effort ("~N plants, roughly a weekend" bands) and cost (count × editable unit price; defaults per container class). This estimate is the manageability payoff and the argument for doing one section per season.

---

## The planner flow (UX outline)

Steps are a workspace, not a wizard — freely revisitable, with the same pill-nav/deep-link (`?plan=<id>&view=<step>`) pattern as the walkthrough. First-run walks 1→5 in order.

| # | Step | The work | Notes |
|---|---|---|---|
| 1 | **Base map** | Upload a satellite/GIS screenshot and calibrate scale (draw a line over a known length — fence panel, driveway), or draw a rectangle + enter dimensions. Trace the yard boundary; outline obstructions (house w/ story preset, fences, tree canopies). North arrow seeded from `SiteProfile.aspect`. | Copy points at county GIS / USGS imagery. Photographing the paper sketch from the walkthrough is an equally blessed path. |
| 2 | **Paths** | Draw the paths you already walk ("where do your feet go?"), then any planned ones; width presets. Paths partition the canvas into rooms — the anti-blank-canvas move. | `paths-first-design.md` *(on `docs/phase-specs`, unmerged)*: desire lines first; keyhole spurs make deep beds reachable. |
| 3 | **Sections** | Draw section polygons in the rooms the paths made. Name each; link it to a walkthrough sun zone (inherits tier + notes) or label it fresh; confirm moisture/soil. Assign per-section **density style** and **build season**; mark today's `phaseState`; pick a hold method (cardboard) for waiting sections. Per-section estimate renders live as labels + density land. | The section list *is* the rollout plan: "fall 2026: back fence bed · under cardboard until then." |
| 4 | **Plant** | Pick the active section → palette (filtered by its labels) → place: structural plants as individuals, theme plants as drifts (odd counts), groundcover/filler as matrix fills with a mix. Plant-first search always available; fit-vs-section read on every result. Layer-share meter per section fills toward the 10/30/50/10 silhouette. | Footprints render at mature width; drifts as soft blobs, fills as textured regions — never 300 dots. |
| 5 | **Check & preview** | Checker panel (below); season scrubber tints the 2D plan by what's in bloom per season; **grown-in view** (unit H) renders the plan in three.js at mature size — orbit, scrub seasons, and stand at your window sightlines. | Fork button everywhere: "try a variant" duplicates the plan with a new name. |

**Entry points:** site-inventory summary step's "what this unlocks" bridge gains its real destination ("your profile feeds your plan →"); cleanup-plan §3 "Coming next" links here for cleaned-up yards; `/sunshower` landing's future trail (visible-path nav backlog item) gets a Planning stop when that work happens — don't build scene work into this unit.

---

## The plan checker

Advisory, dismissible, per-section and whole-plan. Pure functions over `(GardenPlan, plants.json)` — colocated vitest coverage. Each rule cites its vault anchor in the UI ("why this matters" → wiki page). Severity: 💡 suggestion / ⚠️ worth-a-look. Nothing blocks saving, sharing, or planting.

| Rule | Fires when | Anchor |
|---|---|---|
| Bare-ground / green-mulch | Section's groundcover+filler share ≪ ~50% of its quantity (or no `matrixFill` at all in a naturalistic section) | [planting-layers](../vault/concepts/planting-layers.md) — the most common failure mode; bare soil re-invites the weeds Phase 1 removed |
| Bloom-succession gap | A season with zero blooming placements across the plan | `bloom-succession.md` *(unmerged)*; `bloom_season` frontmatter — aesthetics + continuous forage |
| Height inversion | Taller plant in front of a much shorter one relative to the section's primary viewing edge (nearest path or house side) | `planting-design-heuristics.md` *(unmerged)* — tall-back/short-front; dismiss affordance covers the wispy see-through exception (data can't detect it) |
| Lonely drift | Drift/individual count of 1–2 for a non-structural plant | heuristics — group in 3s–5s; "a triangle of 3, not 1 of 20" |
| No repetition | A species or flower color appears in exactly one spot across a multi-section plan | heuristics — repetition is the cohesion tool |
| No grasses/sedges | Plan has zero `plant_type: grass` placements | heuristics — structure, movement, overwinter habitat |
| Crowding (landscaped only) | Mature-width circles overlap beyond clearance tolerance | [plant-spacing](../vault/concepts/plant-spacing.md) — radius math; naturalistic sections skip this rule by design |
| Too big for the bed | Plant's mature width > section's narrow dimension; or foundation clearance violated along a `building` edge | plant-spacing — "a 6'W shrub is impossible in a 4' bed" |
| Sun/water mismatch | Plant's `sun_range`/`water_range` excludes the section's labels | [sun-requirements](../vault/concepts/sun-requirements.md); the palette filters this up front, plant-first entry can bypass it — the checker catches it gently |
| Sightline conflict | Tall placement inside a `highlight` sightline; `privacy` sightline with no tall evergreen screen; `disguise` target still visible | `SiteProfile.sightlines` — the walkthrough data paying off |
| Utility conflict | Tree placed under `utilities.overheadLines`; any digging-phase section while `called811 !== 'done'` (renders the `tel:811` action again) | `SiteProfile.utilities` |
| Unreachable depth | Bed interior > ~5 ft from any path or section edge | `paths-first-design.md` *(unmerged)* — suggest a keyhole spur |
| Phase-order smell | Section `plannedSeason` set with `phaseState: untouched` and no hold method; or everything scheduled for one season | `phased-planting.md` *(unmerged)* — "only clear what you have plants for"; momentum beats ambition |

---

## The grown-in view (unit H — the "3D earns its weight" payoff)

Read-only three.js rendering of the active plan; a view toggle, not a separate route. Reuses the r3f stack; dynamically imported; instanced meshes for matrix fills.

- **Massing, not botany:** plants render as simple archetype forms (mounds, tufts, vase shrubs, canopy-on-trunk trees) scaled to mature `height_ft_max` × `width_ft_max`, positioned from placements (matrix fills scatter deterministically by seed). Obstructions render as extruded footprints. The point is *scale truth* — "that buckeye is 40 feet wide" lands viscerally in 3D.
- **Season scrubber drives it:** bloom season tints flowering forms (from `bloom_season` + flower color when the enrichment scrape lands it); winter shows the structural skeleton — the design-layer legibility check.
- **Sightline bookmarks:** each `SiteProfile.sightlines` entry becomes a saved camera position at eye height — stand at your kitchen window and look at the plan. This is the check no 2D tool can do.
- **Age slider (stretch, cut freely):** scale forms between planting size and mature size — the "why plan for mature width" teaching moment.
- Explicitly **cut-able without blocking MVP**: everything upstream (units A–G) works without it.

---

## Work breakdown (agent-sized)

Same round structure as the prior MVPs. Ship checklist per unit: `npm run lint && npm run typecheck && npm run build && npm test`, then the **ship** skill. Update this doc's status line as units land.

| Unit | Scope | Depends on |
|---|---|---|
| **A** | Plan data layer: `types.ts` (contract above), IndexedDB wrapper + `useGardenPlans` hook, versioning + corrupt-fallback, JSON export/import, fork/duplicate, geometry utils (polygon area, point-in-polygon, nearest-edge distance) — all pure logic unit-tested | — |
| **B** | Base-map canvas: SVG editor shell (pan/zoom, feet-space transform), image upload + scale calibration + opacity, rectangle fallback, boundary + obstruction tracing w/ story presets, north arrow | A (types only) |
| **C** | Plant-data extension: build-script fields + range parser + regeneration (§prerequisites), layer-role/grouping heuristic, palette interface seam + interim picker w/ section-label filtering and plant-first fit read | — (parallel with A/B) |
| **D** | Paths & sections: path drawing + width, section polygons, SiteProfile zone-linking + label confirm, density style + phase state + planned season + hold method, per-section estimate (spacing/quantity math, unit-tested) | A, B |
| **E** | Placement: individual/drift/matrixFill interactions, mature-footprint rendering, drift blobs + fill textures, layer-share meter, quantities panel | C, D |
| **F** | Plan checker: rules table as pure functions + panel UI + dismissals, vault-anchor links | D, E |
| **G** | Season scrubber + 2D overlays: bloom tint per season, sun-label tint, annotation layer polish | E |
| **H** | Grown-in view: r3f massing renderer, season sync, sightline camera bookmarks | E (G for scrub sync) |
| **I** | Integration + copy: route + entry-point audit (site-inventory bridge, cleanup-plan §3, care cross-link), mobile read-mode pass, friendly-to-natives copy review, phases.md/backlog closeout | D–G (H if built) |

**MVP line: A–E + I** = map → paths → sections → plants → quantities, persisted, forkable, exportable. **F–G** make it read-as-intentional (the positioning) — strongly recommended before calling Phase 3 "open." **H** is the flagship moment; schedule by appetite.

Rounds: **1:** A ∥ B ∥ C → **2:** D → E → **3:** F ∥ G ∥ H → **4:** I.

## Explicitly deferred (keep on the backlog)

- **Computed sun/shade** (suncalc + obstruction shadow projection, per-datum confidence) — the M2 living-inventory design *(on `docs/phase-specs`, unmerged)*; requires its S0 feasibility spike first. The planner's obstruction heights + `deciduous` flags are captured now so this can land later without re-tracing.
- **Outcome log** (thrived/struggled/died/moved per placement, feeding next-season weighting) — needs persistence beyond one device to be trustworthy; lands with Supabase/M7.
- **Phase-2 selector integration** — replaces the interim palette behind the same seam; brings companion pairing (`native.companions`) and the nudge-toward-natives UX.
- **Full bloom/forage calendar** (month-by-month, forage-gap detector) — M5; needs month-level bloom data the vault doesn't carry yet.
- **Nursery availability / garden recipes / starter kits** — M6 beyond the count estimate.
- **Sketch/photo upload to cloud, plan sharing links** — behind the Supabase storage decision.
- **Sociability backfill** (CA-native values source) — upgrades the layer-role heuristic in place; tracked in backlog (schema field already exists).

## Open questions for Luc

1. **Confirm the 2D-edit / 3D-view split** (Scope decision 1). It's the spec's spine; everything else assumes it.
2. **Is unit H (grown-in view) in the first build or a fast-follow?** MVP works without it, but it's the demo moment and the backlog framed Phase 3 around it.
3. **The `docs/phase-specs` branch needs a reconciliation decision** — it holds four concept pages + a synthesis this spec cites, plus the milestone table whose M1/M2 rows are now partly overtaken by the shipped walkthrough and this spec. Options: rebase it onto main and re-cut the planning-doc edits, or cherry-pick the vault content and retire the branch. Until then, the *(unmerged)* citations here don't resolve on main.
4. **Regenerating `plants.json` changes the cleanup-plan picker** (natives join the autocomplete pool). Fine to ship with unit C + a picker note, or should the picker-tiering backlog item ride along?

## References

[Backlog → App/UI Phase-3 item](sunshower_backlog.md) · [site-inventory MVP (pattern + SiteProfile contract)](sunshower_site_inventory_mvp.md) · [phases.md → Phase 3](sunshower/phases.md) · [tech-stack.md](sunshower/tech-stack.md) · [CONTEXT.md → What to avoid](sunshower/CONTEXT.md) · vault: [planting-layers](../vault/concepts/planting-layers.md) · [plant-sociability](../vault/concepts/plant-sociability.md) · [plant-spacing](../vault/concepts/plant-spacing.md) · [bubble-drawing](../vault/concepts/bubble-drawing.md) · [designed-plant-communities](../vault/concepts/designed-plant-communities.md) · [garden-zoning](../vault/concepts/garden-zoning.md) · [orderly-frames](../vault/concepts/orderly-frames.md) · [landscape-archetypes](../vault/concepts/landscape-archetypes.md) · [planting-technique](../vault/concepts/planting-technique.md) · [sun-requirements](../vault/concepts/sun-requirements.md) · *(on `docs/phase-specs`, unmerged)*: `paths-first-design` · `phased-planting` · `bloom-succession` · `planting-design-heuristics` · `synthesis/garden-planning-flow-signals`
