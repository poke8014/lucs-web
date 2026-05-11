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

### Agent B — Per-plant removal-method data
- **Goal:** enrich plant records with plant-specific `removal_method` + `removal_notes[]` so plans show real per-species differences (broom ≠ blackberry ≠ ivy ≠ fennel) instead of the current 3 generic spread-mechanism patterns in [plan.ts](../src/app/sunshower/cleanup-plan/plan.ts). Source from UC IPM / Cal-IPC management notes for ~30 most-likely-in-a-CA-yard invasives.
- **Owns:**
  - [src/data/plants.json](../src/data/plants.json) — schema extension
  - [types.ts](../src/app/sunshower/cleanup-plan/types.ts) — add fields
  - Small note in `vault/` documenting sources used
- **Depends on:** nothing (data work)
- **DoD:** 30+ plants have plant-specific methods + caution strings; type schema updated.

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

### Agent D — Expanded plan output
- **Goal:** restructure the plan step into three sections:
  1. **Remove** — per-plant detailed method (Agent B data) + plant-specific cautions
  2. **Prep the area for planting** — generic guidance driven by yard state (Agent C): cleanup-method recommendation, "don't compost rhizome fragments", "leave existing trees alone", what "ready to plant" looks like
  3. **Coming next** — explicit placeholder for timing/soil-prep/plant selection (deferred items)
- **Owns:**
  - PlanSection in [page.tsx](../src/app/sunshower/cleanup-plan/page.tsx)
  - [plan.ts](../src/app/sunshower/cleanup-plan/plan.ts) — rework `buildPlan` for new fields + context
- **Depends on:** B (data shape), C (context type)
- **DoD:** plan shows per-plant methods that visibly differ; prep section reads as useful, not boilerplate.

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
