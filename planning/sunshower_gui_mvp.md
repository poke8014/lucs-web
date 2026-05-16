# Sunshower — GUI MVP Backlog

> **Status: CLOSED (2026-05-16).** The MVP shipped — Agents A / B / C / E and cleanup-plan Layers A / B / C are live. This file is kept as the per-agent build record (what shipped, and where it deviated from spec). All remaining open work was migrated to [sunshower_backlog.md](sunshower_backlog.md): Agent D §2–3 → *Cleanup-plan rendering → sections 2–3*; the post-DB *Deferred* list → a *Plan enrichment — post-DB* icebox entry under *App / UI*. **Don't add new tasks here — use the backlog.**

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

### Agent C — Homepage yard-state router ✅ (2026-05-16)
PR #16 (`feat/sunshower-yard-state-router`). *Reframed 2026-05-15 (was: "Site context (lean)" — a step inside cleanup-plan); shipped as the app's front door.*

`/sunshower` now leads with a **"How's your yard looking today?" dropdown** (4 explicit phase options) rather than the spec'd free-text field + keyword matcher — a dropdown removes the matcher ambiguity and makes the four routes legible. An idle **cycling label** above the control carries the placeholder-example intent. New [yardState.ts](../src/app/sunshower/yardState.ts) holds `YardState = 'overgrown' | 'partial' | 'bare' | 'established'` + `isYardState` + `routeForYardState` (replaces the planned `matchYardState` in `types.ts`); new [YardStateRouter.tsx](../src/app/sunshower/YardStateRouter.tsx) (dropdown + idle cycling) and [SunshowerLanding.tsx](../src/app/sunshower/SunshowerLanding.tsx) (landing shell); [page.tsx](../src/app/sunshower/page.tsx) is now a thin wrapper.

Routes as shipped: overgrown → `cleanup-plan?yard=overgrown`; partial → `cleanup-plan?yard=partial` (selective-cleanup framing); bare → `/sunshower/site-inventory`; established → `/sunshower/care`. The bare/established destinations shipped as **dedicated "coming soon" interstitial route pages** ([site-inventory/page.tsx](../src/app/sunshower/site-inventory/page.tsx), [care/page.tsx](../src/app/sunshower/care/page.tsx)) matching the cleanup-plan visual vocabulary — stronger than the spec'd inline wiki-link interstitials, and they give the full-walkthrough / Phase-4 backlog items a real landing surface. [cleanup-plan/page.tsx](../src/app/sunshower/cleanup-plan/page.tsx) reads `?yard=` via `useSearchParams` (Suspense-wrapped) and swaps to selective-cleanup header framing for `partial`; the flow stays at its original 3 steps (input → confirm → plan) — yard state arrives with the user, no internal context step.

Shipped alongside (beyond original Agent C scope, part of "responsive landing"): a **full mobile pass** — desktop keeps the immersive fixed 3D scene; mobile becomes a scrollable document with the 3D shovel as an in-flow stage. New `backdrop` Scene variant ([SceneBackdrop.tsx](../src/app/sunshower/SceneBackdrop.tsx)) keeps ambient sun/rain/ground continuous across the breakpoint; fluid `clamp()` type, raised `md` structural breakpoint, off-center shovel slides toward center as the window narrows, clickable "cleanup plan" pill above the shovel, and inner-page mobile fixes (stacked confirm rows, wrapped stepper, 16px inputs / no iOS zoom).

### Agent E — Entry/landing ✅ (2026-05-11)
Shipped via the rebrand + persistent-canvas commits. [src/app/sunshower/page.tsx](../src/app/sunshower/page.tsx) is the "a garden, in progress" landing inside the persistent three.js scene; the shovel hotspot routes to `/sunshower/cleanup-plan`. Root [src/app/page.tsx](../src/app/page.tsx) now lists active projects in a dropdown nav linking to `/sunshower` and `/tangtherapeutics`. The richer four-phase trail (Cleanup → Selection → Planning → Care) lives in the backlog under "Visible-path navigation across the four phases".

---

## Round 2 — after B and C land

### Agent D — Expanded plan output (yard-wide, grouped)
- **Framing:** the plan is a **plan for the yard**, not a list of plant detail cards. Once a user confirms their picks, they want a sequence of removal actions to take across the whole yard. Plants with overlapping methods get one shared instruction; plant-specific gotchas surface as bullets under that group.
- **Status:** Section 1 + the yard-wide summary shipped (Layers A + B; Layer C refreshed the notes). **Sections 2–3 were migrated to the backlog (2026-05-16)** — tracked under [Cleanup-plan rendering → sections 2–3](sunshower_backlog.md#cleanup-plan-rendering--wiring-the-wricuc-ipm-data-into-the-user-facing-plan-added-2026-05-12). This doc is closed; the framing + anti-goal here are kept as the design rationale that backlog entry references.
  1. ✅ **Remove (grouped by method)** — Layer A. `buildPlan` returns method-grouped output ordered by Cal-IPC severity → group size → method key; null-method plants sink to a single "undocumented" group with `spread_mechanisms`-derived fallback bullets.
  2. → **Prep the area for planting** — migrated to backlog. Generic yard-state-driven guidance (cleanup-method rec, "don't compost rhizome fragments", "leave existing trees alone", what "ready to plant" looks like). Unblocked by Agent C (PR #16); yard state arrives via the `?yard=` param (`overgrown` | `partial`).
  3. → **Coming next** — migrated to backlog. Placeholder section for the deferred timing / soil-prep / plant-selection items.
- **Anti-goal:** no per-plant detail card / no "plant + photo + method" repeating block. Photos can stay on the confirm step; the plan step is action-first.

---

## Open scope questions before dispatching

*(none open — Agent C's reframe to a homepage router was resolved 2026-05-15; the previous "Site context (lean)" step inside cleanup-plan is no longer in scope.)*

---

## Deferred (not in MVP, post-DB expansion)

*Migrated 2026-05-16 to [sunshower_backlog.md](sunshower_backlog.md) — consolidated as the **Plan enrichment — post-DB** icebox entry under *App / UI*. Kept here for context; the backlog is authoritative.*

- iNat API import (username/URL → fetched observations)
- Native plant classification (3-tier: native / benign / invasive)
- CA planting window timing (zone-based)
- Soil-prep recommendations (per plant or per region)
- Best times to mulch (per region)
- Bridge to phase 2: plant selection recommendations
- Site context fields beyond yard state (sun, soil type, region, water)
