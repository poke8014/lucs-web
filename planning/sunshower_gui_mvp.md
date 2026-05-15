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

### Agent C — Homepage yard-state router
*Reframed 2026-05-15 (was: "Site context (lean)" — a step inside cleanup-plan). The yard-state question is now the app's front door instead of an internal cleanup-plan step.*

- **Goal:** Gentle phase-routing prompt on `/sunshower`. Question: *"How's your yard looking today?"* with **cycling placeholder examples** in the text field — sample answers fade in/out (e.g., *"overgrown with weeds…"* → *"mostly bare dirt…"* → *"partially planted, needs help…"* → *"established, just want to care for it…"*). On submit, the entered text is matched to a yard state which routes the user to the appropriate phase. Free-text is fine for MVP — the matcher can be keyword-based (overgrown/weedy → cleanup; bare/empty/dirt → site-inventory; partial → cleanup-with-care; established/mature → care).
- **Routes (MVP):**
  - *Overgrown / weedy* → `/sunshower/cleanup-plan` (today's flow, with yard state pre-populated)
  - *Mostly bare* → "Coming soon" interstitial linking to [vault/concepts/site-inventory.md](../vault/concepts/site-inventory.md) (full walkthrough is a follow-up backlog item)
  - *Partially planted* → `/sunshower/cleanup-plan` with a care/selective-cleanup framing
  - *Established* → "Coming soon" interstitial linking to existing Care-relevant wiki pages ([vault/concepts/watering.md](../vault/concepts/watering.md), [vault/concepts/pruning.md](../vault/concepts/pruning.md), [vault/concepts/composting.md](../vault/concepts/composting.md)) — Phase 4 content is a wiki + app gap (see [backlog](sunshower_backlog.md#beginner-gardening-ideas-added-2026-05-15)).
- **Owns:**
  - [src/app/sunshower/page.tsx](../src/app/sunshower/page.tsx) — the landing now leads with the prompt. Open design Q: does the prompt sit as a chrome overlay on top of the persistent three.js scene, or does it occupy a hero block above the scene with the shovel hotspot still accessible below? Recommend the latter for MVP — preserves the existing direct-entry path for repeat users.
  - New `YardStateRouter.tsx` — input + cycling-placeholder animation + keyword matcher + redirect.
  - [src/app/sunshower/cleanup-plan/page.tsx](../src/app/sunshower/cleanup-plan/page.tsx) — read yard state from URL query param (e.g. `?yard=overgrown`) or session storage. The previously-planned "Site context" step between confirm and plan is **gone** — yard state arrives with the user.
  - [types.ts](../src/app/sunshower/cleanup-plan/types.ts) — add `YardState = 'overgrown' | 'partial' | 'bare' | 'established'` and a `matchYardState(input: string): YardState` helper.
- **Open design qs:**
  - Returning users with a known yard state — skip the prompt or always show? Recommend: show on `/sunshower` always (cheap, no auth yet), but `/sunshower/cleanup-plan` works standalone for deep links.
  - Cycling-placeholder timing — 2-3s per phrase feels right; pause on focus.
  - If the input doesn't match any known state, default route to cleanup-plan (the current behavior) with a gentle prompt explaining why.
- **Depends on:** nothing (unblocks Agent D's "prep for planting" section).
- **DoD:** Landing shows the routing prompt; entering yard state navigates to the correct phase with state preserved; cleanup-plan flow returns to its original 3 steps (input → confirm → plan) since the context step moved upstream.

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

*(none open — Agent C's reframe to a homepage router was resolved 2026-05-15; the previous "Site context (lean)" step inside cleanup-plan is no longer in scope.)*

---

## Deferred (not in MVP, post-DB expansion)

- iNat API import (username/URL → fetched observations)
- Native plant classification (3-tier: native / benign / invasive)
- CA planting window timing (zone-based)
- Soil-prep recommendations (per plant or per region)
- Best times to mulch (per region)
- Bridge to phase 2: plant selection recommendations
- Site context fields beyond yard state (sun, soil type, region, water)
