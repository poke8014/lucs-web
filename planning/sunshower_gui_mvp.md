# Sunshower — GUI MVP Backlog

User-facing goal: a user identifies plants in their yard (using iNaturalist as the ID tool), enters them into our app, and receives a detailed "attack plan" for removing invasives and preparing the area for planting.

Builds on the existing [/sunshower/cleanup-plan](../src/app/sunshower/cleanup-plan/page.tsx) MVP (pick-list → confirm → removal plan, ~137 Cal-IPC invasives).

---

## Scope decisions locked in

- **iNat integration:** none. We use our 137-plant invasive DB to power a dropdown autocomplete; users select plants they identified in iNat. No API/OAuth.
- **Attack plan scope:** per-plant removal methods (differ by species) + a generic "prepare area for planting" section. Timing windows, soil prep, and mulch timing are **deferred until plant DB is richer**.
- **Native classification:** deferred. MVP stays invasive-focused; we'll add nativity tiering once we have a native plant dataset.

---

## Round 1 — parallelizable

### Agent A — Autocomplete plant picker ✅ (2026-05-11)
PR #4. Multi-select autocomplete over the 137-plant DB replaces the free-text textarea — scientific + common + alias search, photo thumbs, keyboard nav, matched-term disambiguation in the dropdown. New [PlantPicker.tsx](../src/app/sunshower/cleanup-plan/PlantPicker.tsx) + [PhotoLightbox.tsx](../src/app/sunshower/cleanup-plan/PhotoLightbox.tsx) (clicking a confirm-step photo opens a full-viewport viewer with keyboard nav + attribution). `searchPlants(query, limit)` in [resolver.ts](../src/app/sunshower/cleanup-plan/resolver.ts) supersedes the old `resolveName` / `parseInputList`; `Pick` type threads the matched term into the confirm row.

### Agent B — Per-plant removal-method data ✅ (2026-05-11)
New `RemovalMethod` union in [types.ts](../src/app/sunshower/cleanup-plan/types.ts) with 10 canonical keys (`hand_pull`, `dig_taproot`, `cut_stump_herbicide`, `cane_cut_dig_crown`, `pull_vine_dig_crown`, `dig_rhizome_complete`, `dig_bulb_complete`, `sheet_mulch_smother`, `mow_before_seed`, `solarize_summer`). 38 yard-relevant plants annotated in [plants.json](../src/data/plants.json) via [vault/scripts/apply_removal_methods.py](../vault/scripts/apply_removal_methods.py); remaining 99 carry `removal_method: null`. Distribution oversamples broom, brome/oat/foxtail, vine, thistle, and clumping grass so Agent D's grouped output has real groups. Vocabulary + sources at [vault/synthesis/invasive-removal-methods.md](../vault/synthesis/invasive-removal-methods.md). Citations follow-up: added `removal_sources: string[]` on Plant; scraped the full 274-PDF WRIC corpus via [vault/scripts/scrape_wric.py](../vault/scripts/scrape_wric.py); backfilled per-plant citations via [vault/scripts/backfill_removal_sources.py](../vault/scripts/backfill_removal_sources.py) (36 direct + 1 congener + 1 no-source). v0 `removal_notes[]` unchanged in this pass — rewriting against canonical WRIC text is **Layer C** in the [backlog](sunshower_backlog.md#cleanup-plan-rendering--wiring-the-wricuc-ipm-data-into-the-user-facing-plan-added-2026-05-12).

### Agent C — Site context (lean)
- **Goal:** tiny "tell us about your yard" step between confirm and plan. **One field for MVP:** yard state (overgrown / partially planted / mostly bare). Drives the generic prep section in the plan. Zip/sun/water deferred — no outputs use them yet.
- **Owns:**
  - [page.tsx](../src/app/sunshower/cleanup-plan/page.tsx) — new step
  - New `SiteContext.tsx`
  - [types.ts](../src/app/sunshower/cleanup-plan/types.ts) — add `SiteContext` type
- **Depends on:** nothing
- **DoD:** 4-step flow (input → confirm → context → plan); context persists into plan generation.

### Agent E — Entry/landing ✅ (2026-05-11)
Shipped via the rebrand + persistent-canvas commits. [src/app/sunshower/page.tsx](../src/app/sunshower/page.tsx) is the "a garden, in progress" landing inside the persistent three.js scene; the shovel hotspot routes to `/sunshower/cleanup-plan`. Root [src/app/page.tsx](../src/app/page.tsx) now lists active projects in a dropdown nav linking to `/sunshower` and `/tangtherapeutics`. The richer four-phase trail (Cleanup → Selection → Planning → Care) lives in the backlog under "Visible-path navigation across the four phases".

---

## Round 2 — after B and C land

### Agent D — Expanded plan output (yard-wide, grouped)
- **Framing:** the plan is a **plan for the yard**, not a list of plant detail cards. Once a user confirms their picks, they want a sequence of removal actions to take across the whole yard. Plants with overlapping methods get one shared instruction; plant-specific gotchas surface as bullets under that group.
- **Status:** Sections 1 and a yard-wide summary already shipped via Layers A + B in the [backlog](sunshower_backlog.md#cleanup-plan-rendering--wiring-the-wricuc-ipm-data-into-the-user-facing-plan-added-2026-05-12). Remaining work below is sections 2 + 3.
  1. ✅ **Remove (grouped by method)** — Layer A. `buildPlan` returns method-grouped output ordered by Cal-IPC severity → group size → method key; null-method plants sink to a single "undocumented" group with `spread_mechanisms`-derived fallback bullets.
  2. 📋 **Prep the area for planting** — generic guidance driven by yard state (Agent C): cleanup-method recommendation, "don't compost rhizome fragments", "leave existing trees alone", what "ready to plant" looks like. Blocked on Agent C shipping.
  3. 📋 **Coming next** — explicit placeholder for timing/soil-prep/plant selection (deferred items).
- **Anti-goal:** no per-plant detail card / no "plant + photo + method" repeating block. Photos can stay on the confirm step; the plan step is action-first.
- **Depends on:** B ✅, C (still 📋)

---

## Open scope questions before dispatching

1. **Cut Agent C?** One yard-state field still adds a step. Honest take: worth keeping — "prep for planting" advice that ignores yard state will read as generic. Zero-input is a defensible MVP shortcut though.

---

## Deferred (not in MVP, post-DB expansion)

- iNat API import (username/URL → fetched observations)
- Native plant classification (3-tier: native / benign / invasive)
- CA planting window timing (zone-based)
- Soil-prep recommendations (per plant or per region)
- Best times to mulch (per region)
- Bridge to phase 2: plant selection recommendations
- Site context fields beyond yard state (sun, soil type, region, water)
