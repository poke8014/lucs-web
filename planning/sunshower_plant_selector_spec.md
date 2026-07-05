# Sunshower — Phase 2 Plant Selector (build spec)

> **Status: SPEC (2026-07-05), unowned.** Build plan for Phase 2 (Selection) as outlined in [sunshower/phases.md → Phase 2](sunshower/phases.md#phase-2--plant-selection--sourcing), written for agents to carry out unit-by-unit, modeled on [sunshower_site_inventory_mvp.md](sunshower_site_inventory_mvp.md) (spec → build record). Decisions marked **⚠️ proposed** need Luc's sign-off before the affected unit is dispatched; everything else traces to committed direction ([vault/sources/calscape.md → Phase-2 selector model](../vault/sources/calscape.md), Luc 2026-05-17; selection philosophy, Luc 2026-07-05), shipped code, or vault sources. Follow the **start-task** skill before picking up a unit; update this doc as units ship. Backlog/phases closeout for this spec was done in the 2026-07-05 `docs/phase-specs` reconciliation (M4 row + phases.md Phase-2 link).

**User-facing goal:** a user with a site profile (or without one — nothing is gated) explores the native plants that actually belong where they live, in small digestible batches instead of a 150-item dump; searches for any plant they're curious about and gets an honest read on **how it fits their yard** and **what it does for the local ecosystem**; and builds a saved plant list — the palette that the Phase-3 bed planner places.

---

## The selection philosophy (Luc, 2026-07-05) — read this first

This is the spec's spine, and every copy decision downstream answers to it:

> Nudge users toward similar plants that are native — but don't push them away from non-invasives that also benefit local wildlife, if growing them brings enjoyment to gardening.

Concretely:

1. **Suggesting is centering natives, not policing non-natives.** The default browse surface is 100% native — that's the nudge. When a user brings their own plant (search, or "I already have this"), the app meets them where they are.
2. **Enjoyment is a legitimate selection criterion.** A gardener who loves their lavender keeps their lavender. The app's job is to make the native option *attractive and easy*, never to make the non-native option shameful. This extends the committed friendly-to-natives tone decision ([ops/HANDOFF.md → Decisions](../ops/HANDOFF.md)) from weeds to ornamentals.
3. **Invasives are the only firm "no."** The three-tier model in [phases.md](sunshower/phases.md#plant-tiering--native--non-native-non-invasive--invasive) (🟢 native / 🟡 non-native non-invasive / 🔴 invasive) already encodes this; the vault's `nativity:` enum (`native | non_native_safe | invasive`) carries it in data.
4. **The nudge is a one-time offer, not a nag.** Native alternatives are shown once per plant, dismissibly. A dismissed suggestion stays dismissed.

### The nudge ladder (behavior contract per tier)

| Tier | Badge (tone) | Fit read | Contribution card | Suggestion behavior |
|---|---|---|---|---|
| 🟢 `native` | "Native here" — celebration | Full | Full (the star of the show) | Companions ("grows with") + similar natives ("more like this") |
| 🟡 `non_native_safe` | "Good neighbor" — respect | Full | Honest: what it gives (nectar, structure), what it can't (larval hosting is usually native-only) | One gentle shelf: *"If you'd like more like it — these natives share its vibe."* Per-plant dismissal, remembered. Never repeated after dismissal. |
| 🔴 `invasive` | "Invasive here" — firm, kind | Not scored | What it costs (from `invasive:` block) | Redirect: native stand-ins for the role it plays ("love pampas plumes? deergrass gives the movement without the escape") + link to [cleanup-plan](../src/app/sunshower/cleanup-plan/page.tsx) |
| *(unknown — not in our data)* | "Not in our book yet" — honest | Unknown, said plainly | None | No fake confidence. "If it's thriving and you love it, that counts for a lot." Optionally show profile-fit natives, clearly labeled as browse, not analogs. |

The 🟡 tier has **zero pages today** (vault holds 151 native + 158 invasive) — that's unit E, gated on a source and Luc's curation (see Open questions). The ladder ships day one regardless: 🟢/🔴/unknown cover every current search result, and 🟡 activates as pages land.

---

## How the site profile drives suggestions

The `SiteProfile` ([src/app/sunshower/site-inventory/types.ts](../src/app/sunshower/site-inventory/types.ts), localStorage `sunshower.siteProfile.v1`) is read-only input, loaded through the existing [profile.ts](../src/app/sunshower/site-inventory/profile.ts) loader — same one-way discipline as the [bed-planner spec](sunshower_bed_planner_spec.md). **No profile → the selector still works** (browse all 150, filters manual); the profile sharpens ranking and unlocks the per-zone lens. Every mapping below is a *ranking* signal with a human-readable reason attached — hard exclusion only where physically warranted.

| Profile datum | Plant field(s) | How it's used | Strength |
|---|---|---|---|
| `sunZones[].tier` (5-tier) | `native.sun_range` | The primary lens. User picks which zone they're choosing for ("choosing for: back fence bed"); plants rank by tier↔range compatibility (matrix below) | Rank, per-zone |
| `aspect.cardinal` | modifies sun scoring | S/SW/W aspects harden the read: `morning_shade_afternoon_sun` zones demand full-sun-tolerant plants (inland afternoon sun is the harshest light — [vault/concepts/sun-requirements.md](../vault/concepts/sun-requirements.md)) | Modifier |
| `waterSlope.poolingSpots`, `soil.drainage` | `native.water_range`, `native.soil_drainage` | Wet spots surface Wetland/Riparian community members; `fast` drainage boosts chaparral/scrub; `slow` warns on sharp-drainage plants ("many CA natives rot in wet roots" — [vault/concepts/soil-basics.md](../vault/concepts/soil-basics.md)) | Rank |
| `soil.phClue` | `native.soil_ph` | Soft range check — acid/alkaline-leaning yards demote out-of-range plants with a stated reason | Rank |
| `soil.texture` | `soil[]` tags | Advisory badge only (tags are a conservative heuristic per the Calscape normalization) | Badge |
| `wind.exposure` | *(no plant field exists)* | Advisory copy on exposed sites; honest data gap — no per-plant wind tolerance in the corpus | Copy only |
| `utilities.overheadLines` | `height_ft_max` | **Hard flag**: trees maturing >25 ft carry a "not under power lines" warning when lines are present | Flag |
| `sightlines[]` (privacy/disguise) | `plant_type` + `height_ft_max` | Role shortcut: "screening candidates" pre-filter (tall shrubs/trees). Evergreen-ness isn't in the data — say so rather than guess | Shortcut |
| `archetype` | `native.communities_simplified` | The default browse lens — the palette that matches the yard's bones (mapping below). This is the walkthrough's step 1 paying off, per [vault/concepts/landscape-archetypes.md](../vault/concepts/landscape-archetypes.md): the archetype "constrains the whole downstream palette" | Lens |

### Archetype → community mapping (the palette lens)

Corpus vocabulary (enumerated 2026-07-05 from all 150 pages — counts overlap since plants list several): Woodland 81 · Forest 69 · Chaparral 69 · Grassland 68 · Wetland/Riparian 64 · Coastal Scrub 46 · Desert 13 · Meadow 7.

| SiteProfile `archetype` | Default lens (`communities_simplified` ∩) |
|---|---|
| `grassland` | Grassland, Meadow |
| `woodland_shrubland` | Woodland, Chaparral, Coastal Scrub |
| `forest` | Forest |
| `edge` | Woodland ∪ Grassland (the transition palette — plants appearing in *both* an open and a woody community rank first) |

Wetland/Riparian is **not** archetype-gated — it's triggered by the water story (`poolingSpots`, `slow` drainage), because a wet corner in any archetype wants riparian plants. Desert members surface through the fast-drainage/full-sun path. The lens is a default, never a wall: one tap widens to all communities.

### Sun tier ↔ `sun_range` compatibility (build-time matrix, unit-tested)

The walkthrough captures the 5-tier vocabulary; Calscape ranges use Full Sun / Part Shade / Full Shade endpoints. Mapping principle (from [sun-requirements](../vault/concepts/sun-requirements.md)): morning sun is gentle, afternoon sun is the harshest — so the two "part sun" tiers are *not* symmetric:

| Zone tier | Compatible when range… |
|---|---|
| `full_sun` | includes Full Sun |
| `morning_sun_afternoon_shade` | includes Part Shade (the gentlest part-sun; shade-leaning plants often thrive) |
| `morning_shade_afternoon_sun` | includes Full Sun (treat as full sun + heat flag; part-shade-only plants demoted hard) |
| `dappled_shade` | includes Part Shade or Full Shade |
| `full_shade` | includes Full Shade |

The exact `sun_range` strings must be enumerated from the corpus in unit A and the matrix tested against all 150 (the Calscape rollout precedent: expect format surprises).

---

## How a picked plant relates back — the two cards

Search accepts anything (natives, invasives, future good-neighbors — the cleanup-plan `PlantPicker` autocomplete pattern over `scientific_name`/`common_names`/`aliases`). Every plant detail renders two reads side by side. **This pair is the product**: fit answers "will it live here?", contribution answers "what does it give back?" — right plant (contribution) right place (fit), made visible.

### 1. The fit read (plant ↔ your site)

`fitForZone(plant, zone, profile) → { level: 'great' | 'good' | 'stretch' | 'mismatch' | 'unknown', reasons: [] }` — a pure, unit-tested function. Reasons are sentences, not scores: *"Wants sharp drainage — your clay corner will fight it"*, *"Handles your back fence's afternoon sun."* With no profile: `unknown`, with an invitation to do the walkthrough (link, not gate). The same function is exactly the bed-planner's palette seam (`section labels in → ranked plant list out`) — build it once here, the [bed planner](sunshower_bed_planner_spec.md) consumes it (its palette seam).

### 2. The contribution card (plant ↔ your eco-region)

What this plant does for the place the user lives — the ecological reading of right-plant-right-place ([vault/concepts/right-plant-right-place.md](../vault/concepts/right-plant-right-place.md)), framed **additively** (what you'd be adding to the local food web), never as guilt math.

| Card line | Data | Notes |
|---|---|---|
| *"Verified growing wild within ~10 miles of San Jose"* | The corpus itself — all 150 passed Calscape's location filter (observed nearby + matching ecoregion, [vault/sources/calscape.md](../vault/sources/calscape.md)) | The quiet headline: every native shown *already belongs here*. v1 region is fixed South Bay (HANDOFF invariant 8) |
| *"Hosts N butterfly & moth species"* | `native.butterflies_moths_supported` | Count today; **named species (+ which ones) when the enrichment scrape lands** (`host_plant_for` — in flight on `feat/calscape-enrichment`). Larval hosting is the card's centerpiece: it's the thing non-natives almost never provide |
| *"Feeds & shelters: bees, birds, caterpillars…"* | `native.attracts_wildlife`, `pollinators` | Full Calscape wildlife list, not just the pollinator trio |
| *"A member of the {oak woodland} community"* | `native.communities` / `_simplified` | Ties the plant to the wild landscape the yard's archetype echoes — and to the CA-community vocabulary that plugs into the four archetypes ([landscape-archetypes](../vault/concepts/landscape-archetypes.md)) |
| *"Blooms {fall} — a lean season for foragers"* | `bloom_season` | Fall/winter bloomers get a forage-window callout; groundwork for the Phase-3 bloom-gap checker |
| 🟡 variant | `benign:` block (unit E) | Honest asymmetry, kindly put: *"Its flowers feed adult pollinators; native caterpillars can't use its leaves. It gives real joy and some real nectar — a native neighbor could add the nursery."* |
| 🔴 variant | `invasive:` block | What it costs the region (spread, habitat types), and the cleanup-plan handoff |

### 3. Similar natives ("more like this")

`similarNatives(plant, corpus, profile?) → ranked[]` — pure, tested. Similarity axes, in order: shared `communities` → same growth role (`plant_type` + height band) → overlapping `bloom_season` → shared facets (sun/water). `native.companions` membership boosts ("these are literally documented to grow together" — 40 pages carry non-empty companion lists today). Profile, when present, reranks by fit. For 🟡/🔴 picks the same function runs on role/height/bloom axes (no shared communities to lean on), **plus** hand-curated `native_analogs` on 🟡 pages (unit E) which always outrank the algorithm — a human's "same vibe" beats a data proxy.

---

## Scope decisions

### Locked by direction or evidence (build to these)

- **Selector model per Luc 2026-05-17** ([calscape.md](../vault/sources/calscape.md)): location-scoped · garden-type-by-ecology (`communities`) · goal facets (water-wise / pollinator / bird / low-maintenance) · user-suggests-own-plants (picker pattern) · companion pairing · **digestible batches** — small coherent groupings with progressive disclosure, never a 150-item dump.
- **Data: derived JSON, no Supabase.** Same pattern as everything shipped (HANDOFF invariant 3: plants.json derived from frontmatter; future Supabase derived the same way). No auth, no DB standup.
- **Profile is optional input everywhere.** Guidance never a gate (committed direction, Luc 2026-07-03, restated in the bed-planner spec).
- **Persistence: `sunshower.plantList.v1`** in localStorage, versioned like the SiteProfile, shaped for the future `section_plants` rows. Small data (slugs + statuses), no IndexedDB needed.
- **Nativity tiering + gentle-nudge UX** as specified in [phases.md → Plant tiering](sunshower/phases.md#plant-tiering--native--non-native-non-invasive--invasive) and sharpened by the 2026-07-05 philosophy above.
- **Mobile-first** (nursery aisle + couch browsing are the real venues), same visual vocabulary as cleanup-plan/site-inventory (cream panels, serif headers, tier badges echoing the Cal-IPC badge pattern).
- **Copy: friendly-to-natives.** No urgency language outside the 🔴 tier; enjoyment named as a legitimate reason in actual UI copy.

### ⚠️ Proposed (needs Luc's sign-off)

1. **Route `/sunshower/plant-selector`**, detail as a deep-linkable drawer (`?plant=<slug>`), not per-plant routes. SSG'd plant pages from wiki bodies wait for enrichment prose (the 150 bodies are stubs).
2. **Don't wait for the enrichment scrape.** The backlog sequences selector *after* enrichment, but everything the selector ranks on is already in frontmatter (communities, companions, facets, host counts). Enrichment upgrades the contribution card in place (named hosts, prose). Recommendation: build now, enrichment enriches.
3. **Dismissal memory** (`sunshower.selectorPrefs.v1`): "don't suggest swaps for my lavender" is remembered per-plant. Tiny personalization with real tone stakes — it's the mechanism that makes the nudge a one-time offer rather than a nag.
4. **`benign:` frontmatter block** for 🟡 pages (unit E): `origin_region`, `wildlife_value: []`, `wildlife_notes`, `native_analogs: []` (slugs), `sources`. Schema addition → vault convention says discuss before writing; starter list (~20–30 South Bay garden classics: lavender, rosemary, star jasmine, citrus, camellia…) needs Luc's curation + a citable source.

## Anti-goals

- **No native range map** (Mapbox/Leaflet + ecoregion GeoJSON — its own project; the "verified within ~10 miles" line delivers the core message textually).
- **No nursery finder / availability integration** — `native.nursery_availability` renders as a badge ("commonly available"), nothing more.
- **No layout or placement** — that's the bed planner. The plant list is a palette, not a plan.
- **No scoring theater.** No numeric match percentages; levels + reasons only. A "92% match" implies precision the data doesn't have.
- **No shame mechanics.** No yard-wide "native purity" score, no red badges on 🟡 plants, no counting how many suggestions were dismissed.
- **No new scraping** in units A–D (zero credits; corpus is local). Unit E sourcing is hand-curated, not scraped.

---

## Data contract

### plants.json extension (unit A — shared prerequisite with bed-planner unit C)

The bed-planner spec's §Data-layer prerequisites documented that `plants.json` is stale (159 records; the 150 natives never regenerated in) and the build script omits the `native:` block. **One shared unit covers both specs** — whichever builds first implements the union:

- Regenerate → natives join the file (⚠️ flag in PR: cleanup-plan picker pool changes — pairs with the existing picker-tiering backlog item).
- Emit (bed-planner list): `bloom_season`, `pollinators`, `soil`, `sociability`, `native.{communities, communities_simplified, companions, sun_range, water_range, soil_drainage, ease_of_care, nursery_availability, is_cultivar}`; parse `height_ft`/`width_ft` ranges → `{min,max}` numerics.
- Emit (selector additions): `native.{butterflies_moths_supported, attracts_wildlife, soil_ph, rarity, calscape_url}`, `host_plant_for` (fills post-enrichment), and pass through `benign:` when unit E lands.

### The plant list

```ts
// src/app/sunshower/plant-selector/types.ts
type PlantListStatus = 'considering' | 'chosen' | 'already_have'

interface PlantListEntry {
  id: string            // crypto.randomUUID()
  plantSlug: string
  status: PlantListStatus
  zoneId?: string       // SiteProfile.sunZones[].id — where it's destined / lives
  notes?: string
}

interface PlantList {
  version: 1
  updatedAt: string
  entries: PlantListEntry[]
}
// localStorage 'sunshower.plantList.v1'; same load/save/fallback discipline
// as profile.ts; maps to future section_plants rows.
```

`already_have` is load-bearing for the philosophy: users log existing plants (including 🟡 keepers from the cleanup-plan's "partial" flow), and the list view rolls up what their garden **already contributes** — hosts supported, seasons covered, wildlife fed. The nudge then has a positive frame: "your yard already feeds X; here's what would fill the fall gap."

---

## UX outline

| Surface | What happens |
|---|---|
| **Landing** | Lens header: active zone picker (from profile sun zones) + archetype-community chips; no profile → "all of San Jose's palette" + walkthrough invitation. Below: batches. |
| **Batches** | Small coherent groups (~6), one per growth role (canopy 12 · shrubs 20 · perennials 46 · annuals 50 · grasses 19 · vines 3), ranked by fit within the active lens; "show me different ones" reroll; facet toggles (water-wise / pollinator powerhouse / bird-friendly / easy-care / bloom season). |
| **Search** | PlantPicker-pattern autocomplete over the full corpus; every result badged by tier before tap. |
| **Detail drawer** | Photo (iNat display-tier), tier badge, fit read (per active zone; zone switcher inline), contribution card, "grows with" (companions), "more like this" (similar natives / analogs shelf per the ladder), add-to-list with status + zone. `?plant=<slug>` deep link. |
| **My plant list** | Grouped by zone → status; per-zone fit summary; garden-wide contribution rollup (the `already_have` payoff); export waits for the bed planner (the list *is* the handoff). |
| **Entry points** | Site-inventory summary "what this unlocks" bridge gets its real destination; cleanup-plan §3 adds the selection link when live; `/sunshower` landing card. |

---

## Work packages (agent-sized)

Ship checklist per unit: `npm run lint && npm run typecheck && npm test && npm run build`, then the **ship** skill; update this doc as units land.

| Unit | Scope | Depends on |
|---|---|---|
| **A** | **Data & logic core.** plants.json regeneration + build-script extension (shared list above; flag the picker change); `sun_range` string enumeration + tier↔range matrix; archetype↔community mapping; `fitForZone` / `similarNatives` / `contribution` as pure functions — all vitest-covered against the real 150-plant corpus, not fixtures | — |
| **B** | **Selector surface.** Route + server wrapper, lens header (zone picker, community chips), role batches with reroll + facet toggles, search, detail drawer + `?plant=` deep link, mobile-first pass | A |
| **C** | **Nudge & contribution UX.** Tier ladder behaviors end-to-end, contribution card (incl. 🟡/🔴/unknown variants), analogs shelf, dismissal memory, copy pass against the philosophy section (the review question for every string: *"would this make someone feel bad about a plant they love?"*) | A, B |
| **D** | **Plant list + handoffs.** `PlantList` persistence + list view + contribution rollup; palette-seam adapter exporting `fitForZone` in the [bed-planner](sunshower_bed_planner_spec.md)'s expected shape; entry-point audit | A–C |
| **E** | **Good-neighbor content track** *(gated on ⚠️ 4)*. `benign:` schema in vault/CLAUDE.md, ~20–30 curated 🟡 pages with `native_analogs`, build-script passthrough, ladder auto-activates | Luc sign-off; ships any time after C |

**Rounds:** 1: A → 2: B → 3: C ∥ D → E whenever unblocked. **MVP line: A–D** (selector is fully useful natives-only; the 🟡 ladder rung activates when E lands).

## Explicitly deferred (keep on the backlog)

- Native range map (Mapbox/Leaflet + EPA/USDA ecoregion GeoJSON) and nursery finder — the two remaining phases.md Phase-2 features.
- SSG plant detail pages from wiki bodies (post-enrichment, when bodies are prose not stubs).
- Month-level bloom + forage calendar (M5 territory; data is season-granular).
- Region retargeting (ZIP/coordinate input re-running the Calscape filter) — v1 is South Bay (invariant 8).
- Supabase `plants`/`site_profiles`/`section_plants` migration — when auth lands.
- Sociability-informed grouping (field exists, unset; a CA-native values source upgrades ranking in place).
- Flower color as a similarity axis (needs enrichment-scrape data).

## Open questions for Luc

1. **⚠️ 1–3 sign-offs** — route shape, build-now-vs-wait-for-enrichment, dismissal memory.
2. **⚠️ 4 — the 🟡 starter set**: bless the `benign:` block shape, and how do you want to source/curate the ~20–30 good-neighbor classics? (Hand-curation from a citable list — e.g., a UC ANR / Xerces pollinator-friendly-ornamental reference — keeps unit E scrape-free; needs the vault ingest discussion either way.)
3. ~~Planning-branch reconciliation~~ **Resolved (2026-07-05):** the `docs/phase-specs` direction docs, the [bed-planner spec](sunshower_bed_planner_spec.md), and this spec were rebased onto main together; backlog/phases closeout for all three is done and the cross-references now resolve on-branch.
4. **Batch composition taste**: role-bucketed batches of ~6 is a guess at "digestible." Happy to swap for community-bucketed ("a chaparral shelf") or goal-bucketed ("the hummingbird shelf") batches — cheap to change, worth your eye at build time.
