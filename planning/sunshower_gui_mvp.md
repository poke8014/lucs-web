# Sunshower — GUI MVP Backlog

User-facing goal: a user identifies plants in their yard (using iNaturalist as the ID tool), enters them into our app, and receives a detailed "attack plan" for removing invasives and preparing the area for planting.

Builds on the existing [/cleanup-plan](../src/app/sunshower/cleanup-plan/page.tsx) MVP (paste-list → confirm → removal plan, ~137 Cal-IPC invasives).

---

## Scope decisions locked in

- **iNat integration:** none. We use our 137-plant invasive DB to power a dropdown autocomplete; users select plants they identified in iNat. No API/OAuth.
- **Attack plan scope:** per-plant removal methods (differ by species) + a generic "prepare area for planting" section. Timing windows, soil prep, and mulch timing are **deferred until plant DB is richer**.
- **Native classification:** deferred. MVP stays invasive-focused; we'll add nativity tiering once we have a native plant dataset.

---

## Round 1 — parallelizable

### Agent A — Autocomplete plant picker ✅ (2026-05-11)
- **Goal:** replace the textarea on the input step with a multi-select autocomplete over the 137-plant DB. Type "fenn" → see *Foeniculum vulgare — fennel* with photo thumb → select. Chips list shows picks. Common + scientific names both searchable.
- **Owns:**
  - [src/app/sunshower/cleanup-plan/page.tsx](../src/app/sunshower/cleanup-plan/page.tsx) — input step only
  - New `PlantPicker.tsx` component
  - Reuse `resolveName` in [resolver.ts](../src/app/sunshower/cleanup-plan/resolver.ts) (may export an autocomplete-friendly variant)
- **Depends on:** nothing
- **DoD:** pick 3 plants → confirm + plan steps still work end-to-end. Free-text paste removed.
- **Shipped:** PR #4. `searchPlants(query, limit)` replaces `resolveName` as the autocomplete-friendly variant; `resolveName` + `parseInputList` removed (only callers were in `page.tsx`). New [PlantPicker.tsx](../src/app/sunshower/cleanup-plan/PlantPicker.tsx) with keyboard nav, photo thumbs, and matched-term disambiguation in the dropdown (shows e.g. *Hordeum murinum · foxtail* when search hits a non-primary common name). New `Pick` type threads the matched term into the confirm row's "You typed:" label. Bonus: new [PhotoLightbox.tsx](../src/app/sunshower/cleanup-plan/PhotoLightbox.tsx) — clicking a confirm photo opens a full-viewport viewer that scrolls through all 3 photos per plant with keyboard nav + attribution.

### Agent B — Per-plant removal-method data ✅ (2026-05-11)
- **Goal:** enrich plant records with plant-specific `removal_method` + `removal_notes[]` so plans show real per-species differences (broom ≠ blackberry ≠ ivy ≠ fennel) instead of the current 4 generic spread-mechanism patterns in [plan.ts](../src/app/sunshower/cleanup-plan/plan.ts) (`methodFor` only branches on veg/seed markers). Source from UC IPM / Cal-IPC management notes for ~30 most-likely-in-a-CA-yard invasives.
- **Why current plan reads generic:** [plan.ts:44-57](../src/app/sunshower/cleanup-plan/plan.ts#L44-L57) consults only `spread_mechanisms`; no `removal_method` field exists in [types.ts](../src/app/sunshower/cleanup-plan/types.ts) or `plants.json`. Confirmed data gap, not a logic bug.
- **Shape sketch (for D to consume):** `removal_method` should be a **canonical key** (e.g. `hand_pull`, `dig_root_crown`, `cut_stump_paint`, `smother_sheet_mulch`, `mow_then_solarize`) so D can group plants by shared method. `removal_notes[]` carries plant-specific cautions ("blackberry canes re-root from tip layering", "fennel taproot snaps — get the crown").
- **Owns:**
  - [src/data/plants.json](../src/data/plants.json) — schema extension
  - [types.ts](../src/app/sunshower/cleanup-plan/types.ts) — add fields
  - Small note in `vault/` documenting sources used + the canonical method vocabulary chosen
- **Depends on:** nothing (data work)
- **DoD:** 30+ plants have plant-specific methods + caution strings; type schema updated; method values drawn from a documented closed vocabulary so D can group on them.
- **Shipped:** new `RemovalMethod` union in [types.ts](../src/app/sunshower/cleanup-plan/types.ts) with 10 canonical keys (`hand_pull`, `dig_taproot`, `cut_stump_herbicide`, `cane_cut_dig_crown`, `pull_vine_dig_crown`, `dig_rhizome_complete`, `dig_bulb_complete`, `sheet_mulch_smother`, `mow_before_seed`, `solarize_summer`). 38 yard-relevant plants annotated in [plants.json](../src/data/plants.json) via [vault/scripts/apply_removal_methods.py](../vault/scripts/apply_removal_methods.py); remaining 99 carry `removal_method: null` + `removal_notes: []`. Distribution oversamples broom (5), brome/oat/foxtail (5), vine (4), thistle (3), clumping grass (5) so Agent D's grouped output has real groups. Vocabulary + source attribution at [vault/synthesis/invasive-removal-methods.md](../vault/synthesis/invasive-removal-methods.md). Note for D: keys above differ slightly from the original sketch — `dig_root_crown` split into `dig_taproot` / `cane_cut_dig_crown` / `dig_rhizome_complete` / `dig_bulb_complete` since the actions diverge meaningfully.
- **Citations follow-up (2026-05-11):** added `removal_sources: string[]` field on Plant; scraped the full 274-PDF WRIC archive via [vault/scripts/scrape_wric.py](../vault/scripts/scrape_wric.py) into [vault/raw/articles/wric/](../vault/raw/articles/wric/); backfilled per-plant citations via [vault/scripts/backfill_removal_sources.py](../vault/scripts/backfill_removal_sources.py) (36 direct + 1 congener + 1 no-source — stinknet, post-dates the 2013 book). WRIC dataset meta-page at [vault/sources/wric.md](../vault/sources/wric.md). The v0 synthesized `removal_notes[]` are unchanged in this pass; rewriting them against canonical WRIC text is the next follow-up (Agent B v3).

### Agent C — Site context (lean)
- **Goal:** tiny "tell us about your yard" step between confirm and plan. **One field for MVP:** yard state (overgrown / partially planted / mostly bare). Drives the generic prep section in the plan. Zip/sun/water deferred — no outputs use them yet.
- **Owns:**
  - [page.tsx](../src/app/sunshower/cleanup-plan/page.tsx) — new step
  - New `SiteContext.tsx`
  - [types.ts](../src/app/sunshower/cleanup-plan/types.ts) — add `SiteContext` type
- **Depends on:** nothing
- **DoD:** 4-step flow (input → confirm → context → plan); context persists into plan generation.

### Agent E — Entry/landing
- **Goal:** surface the app from the site root. [src/app/page.tsx](../src/app/page.tsx) is a placeholder and `/cleanup-plan` is URL-only. Add a `/sunshower` entry that intros the phased journey (Cleanup → Selection → Planning → Care) and links to `/cleanup-plan` as the only active step.
- **Owns:**
  - New `src/app/sunshower/page.tsx`
  - Root [page.tsx](../src/app/page.tsx) link touch-up
  - [layout.tsx](../src/app/sunshower/layout.tsx) if metadata needs adjusting
- **Depends on:** nothing
- **DoD:** link visible from `/`; clicking into cleanup-plan works.

---

## Round 2 — after B and C land

### Agent D — Expanded plan output (yard-wide, grouped)
- **Framing:** the plan is a **plan for the yard**, not a list of plant detail cards. Once a user confirms their picks, they want a sequence of removal actions to take across the whole yard. Plants with overlapping methods get one shared instruction; plant-specific gotchas surface as bullets under that group.
- **Goal:** restructure the plan step into three sections:
  1. **Remove (grouped by method)** — group confirmed plants by their `removal_method` key (Agent B). One method heading per group ("Cut-stump and paint with herbicide", "Hand-pull before seed set", "Dig root crown and bag fragments"), the affected plants listed under it, with each plant's `removal_notes[]` shown as plant-specific cautions beneath. A plant with no group-mates still appears under its method heading — single-item "groups" are fine. Order groups by Cal-IPC severity of the worst plant in the group, then by group size.
  2. **Prep the area for planting** — generic guidance driven by yard state (Agent C): cleanup-method recommendation, "don't compost rhizome fragments", "leave existing trees alone", what "ready to plant" looks like.
  3. **Coming next** — explicit placeholder for timing/soil-prep/plant selection (deferred items).
- **Anti-goal:** no per-plant detail card / no "plant + photo + method" repeating block. Photos can stay on the confirm step; the plan step is action-first.
- **Owns:**
  - PlanSection in [page.tsx](../src/app/sunshower/cleanup-plan/page.tsx)
  - [plan.ts](../src/app/sunshower/cleanup-plan/plan.ts) — rework `buildPlan` to return method-grouped output (`{ method, methodLabel, plants: { plant, notes[] }[] }[]`) rather than the current flat `PlanItem[]`
- **Depends on:** B (data shape + canonical method vocabulary), C (context type)
- **DoD:** confirming 3+ plants that share a method produces one grouped action with per-plant caution bullets — not three near-identical cards. Prep section reads as useful, not boilerplate.

---

## Open scope questions before dispatching

1. **Route name.** Keep `/cleanup-plan`, or rename (e.g. `/sunshower/cleanup`) before agents touch the file? Cheaper now than after.
2. **Cut Agent C?** One yard-state field still adds a step. Honest take: worth keeping — "prep for planting" advice that ignores yard state will read as generic. Zero-input is a defensible MVP shortcut though.

---

## Deferred (not in MVP, post-DB expansion)

- iNat API import (username/URL → fetched observations)
- Native plant classification (3-tier: native / benign / invasive)
- CA planting window timing (zone-based)
- Soil-prep recommendations (per plant or per region)
- Best times to mulch (per region)
- Bridge to phase 2: plant selection recommendations
- Site context fields beyond yard state (sun, soil type, region, water)
