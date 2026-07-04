# Sunshower — Site-Inventory Walkthrough MVP

> **Status: BUILT (2026-07-04, branch `feat/site-inventory-mvp`).** Detailed build plan for the backlog item *In-app site-inventory walkthrough* ([sunshower_backlog.md → Beginner-gardening ideas](sunshower_backlog.md#beginner-gardening-ideas-added-2026-05-15)). Modeled on the (closed) [sunshower_gui_mvp.md](sunshower_gui_mvp.md) — scope decisions locked up top, then parallelizable agent work packages.
>
> **Build record (all four packages, done inline in one session):**
> - **A — data layer:** `types.ts` (contract verbatim, no deviations), `profile.ts`, `useSiteProfile.ts`, 13 unit tests in `site-inventory.test.ts` (vitest added as devDep + `npm test` script — first test runner in the repo).
> - **B — wizard shell:** `Walkthrough.tsx` — 9-pill stepper (navigation, not a gate), `?step=<id>` deep-links, resume-to-first-open-step (skipped steps don't pull you back), venue chips, mobile-first footer nav.
> - **C — steps 1–8:** one component each under `steps/`; archetype key as a mini-flow; sun-zone editor w/ hourly-photo empty state; `tel:811` action. Open question resolved: cardinal picker is the primary aspect input, bearing-degrees the optional refinement.
> - **D — summary + integration:** summary card w/ per-dimension edit links + Phase-2 bridge; cleanup-plan §3 pointer; care-page cross-link; phases.md repositioning; backlog flip.

**User-facing goal:** a user with a mostly-bare (or freshly cleaned-up) yard walks through a guided inventory of their site — feel, aspect, sun, wind, water/slope, utilities, sightlines, soil clues — and ends with a persistent **site profile**: the structured "what my yard offers" record that the Phase-2 plant selector will consume.

Replaces the "coming soon" interstitial at [/sunshower/site-inventory](../src/app/sunshower/site-inventory/page.tsx) (shipped in PR #16 as the yard-state router's "mostly bare" destination). Content source of truth: [vault/concepts/site-inventory.md](../vault/concepts/site-inventory.md) + the pages it links.

---

## Scope decisions locked in (2026-07-04, w/ Luc)

- **Shape: multi-step guided wizard.** One step per inventory dimension, progress indicator, every step skippable, ends in a site-profile summary. Not a single-page form, not a passive checklist.
- **Persistence: localStorage.** No auth / no Supabase dependency. Profile survives revisits (the sun-map task alone spans a day). Schema is versioned and designed to map 1:1 onto a future Supabase `site_profiles` table. Single-device limitation accepted for MVP.
- **No in-app visuals.** The app *prompts* the paper-sketch and hourly-photo methods; the user does them offline and enters the results as structured data (zone list, bearing, checkboxes). Sketch upload / drawing canvas are fast-follows, not MVP.
- **Archetype step opens the flow.** The Rainer & West qualitative front-end (wander → squint → landscape-selection key → goal archetype) is step 1, ahead of the measured inventory. It's a 2–3 question dichotomous key and its output is exactly what anchors Phase-2 community selection ([vault/concepts/landscape-archetypes.md](../vault/concepts/landscape-archetypes.md): "the selection key is simple enough to encode as an app step").
- **Single yard, zone-granular.** One profile per browser for MVP. Sun zones (and sightline entries) are repeatable list items — that's the granularity the density-sectioning direction needs later; no multi-yard or per-section profiles yet.
- **Copy tone:** friendly-to-natives, curiosity-forward ("a blank yard is full of clues" register of the current interstitial). This flow has no invasives in it — no urgency language anywhere.

## Anti-goals

- No plant recommendations in this flow. The profile *feeds* Phase 2; the bridge is a "coming next" pointer, mirroring cleanup-plan §3.
- No mini layout editor. Zone capture is a labeled list, not a drawn map — drawing belongs to Phase 3's bed planner.
- No photo storage. Data-URLs would blow the ~5MB localStorage budget; uploads wait for the Supabase decision.

---

## The site profile — data contract

The central artifact. Everything below lives in a new `types.ts` under `src/app/sunshower/site-inventory/`. Field vocabulary traces to the vault pages noted inline.

```ts
// 5-tier sun vocabulary — vault/concepts/sun-requirements (SummerWinds)
type SunTier =
  | 'full_sun'
  | 'morning_sun_afternoon_shade'
  | 'morning_shade_afternoon_sun'
  | 'dappled_shade'
  | 'full_shade'

// vault/concepts/landscape-archetypes (Rainer & West)
type Archetype = 'grassland' | 'woodland_shrubland' | 'forest' | 'edge'

type Cardinal = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

type StepId =
  | 'archetype'
  | 'aspect'
  | 'sun_map'
  | 'wind'
  | 'water_slope'
  | 'utilities'
  | 'sightlines'
  | 'soil'

type StepStatus = 'todo' | 'in_progress' | 'done' | 'skipped'

interface SunZone {
  id: string          // crypto.randomUUID()
  label: string       // user's name: "back fence bed", "strip by driveway"
  tier: SunTier
  notes?: string
}

interface Sightline {
  id: string
  kind: 'highlight' | 'disguise' | 'privacy'
  description: string
}

interface SiteProfile {
  version: 1
  updatedAt: string   // ISO
  steps: Record<StepId, StepStatus>

  archetype?: {
    value: Archetype
    draws?: string     // what pulled you in (free text)
    repels?: string    // what repelled you
  }
  aspect?: {
    bearingDeg?: number     // compass-app reading, back of yard facing out
    cardinal?: Cardinal     // derived from bearingDeg, or entered directly
  }
  sunZones: SunZone[]
  wind?: {
    exposure: 'sheltered' | 'moderate' | 'exposed'
    direction?: Cardinal    // prevailing, if known
    notes?: string
  }
  waterSlope?: {
    grade: 'flat' | 'gentle' | 'steep' | 'mixed'
    poolingSpots?: string   // where rain sits
    hoseReach: 'all' | 'partial' | 'none'
    notes?: string
  }
  utilities?: {
    overheadLines: boolean
    called811: 'done' | 'scheduled' | 'not_yet'
    fixtures?: string       // AC, spigots, meters worth flagging
  }
  sightlines: Sightline[]
  soil?: {
    phClue: 'acid_indicators' | 'alkaline_indicators' | 'no_clue'
    // acid = rhodos/azaleas/camellias thriving nearby; alkaline = lavender/lilac
    drainage?: 'fast' | 'ok' | 'slow'   // optional %-hole or observation
    texture?: 'sandy' | 'loamy' | 'clay' | 'unsure'
    notes?: string
  }
}
```

**Storage:** key `sunshower.siteProfile.v1`, JSON-serialized, written on every field change (debounced). `version` gates future migrations. All reads/writes behind one client hook (`useSiteProfile`) — SSR-safe: initial render assumes empty, hydrate from localStorage in an effect, never touch `window` at module scope. This shape maps 1:1 to the future `site_profiles` Supabase row (jsonb columns per dimension), same pattern as plant frontmatter → `plants` table.

---

## The steps — content outline

Each step = short *why* (2–3 sentences from the vault page) + a *do this* field task + structured capture. Every step has a **venue tag** (`indoor` / `outdoor` / `either`) rendered as a small chip — the cheap down-payment on the iceboxed parallel-tracks UX. All copy cites its vault concept; agents draft from the vault pages, not from general knowledge.

| # | Step | Venue | Field task prompt | Captures | Vault anchor |
|---|------|-------|-------------------|----------|--------------|
| 1 | **Feel the site** | outdoor | Wander with no agenda; note pulls/repels; squint past details to the bones | `archetype` via 2–3-question key: trees/shrubs present? → canopy open or closed? → transition zone? | [landscape-archetypes](../vault/concepts/landscape-archetypes.md), [site-inventory §two modes](../vault/concepts/site-inventory.md) |
| 2 | **Aspect** | outdoor | Open phone compass, stand at back of yard facing out, read bearing | `aspect.bearingDeg` → derived `cardinal`; blurb on S-facing = warmer/earlier, N-facing = cooler/moister | [site-inventory §sun and aspect](../vault/concepts/site-inventory.md) |
| 3 | **Sun map** | either | Hourly-photo method: alarm every hour 8am–8pm on a sunny day, same vantage point, compare at day's end | `sunZones[]` — add/name zones, assign 5-tier; explicit "come back tomorrow — your progress is saved" affordance | [site-inventory §hourly-photo method](../vault/concepts/site-inventory.md), [sun-requirements 5-tier](../vault/concepts/sun-requirements.md) |
| 4 | **Wind** | outdoor | Where do you feel it? Flags/trees lean? Note sheltered vs. exposed corners | `wind.exposure`, optional prevailing `direction` | [site-inventory §wind](../vault/concepts/site-inventory.md) |
| 5 | **Water & slope** | outdoor | After rain (or hose test): where does water pool, where does it race off? Does the hose reach? | `waterSlope` | [site-inventory §topography](../vault/concepts/site-inventory.md) |
| 6 | **Utilities** | either | Look up (power lines), look around (AC, spigots, meters), call **811** before any digging | `utilities`; 811 rendered as a prominent tel: action, `called811` tri-state | [site-inventory §utilities](../vault/concepts/site-inventory.md) |
| 7 | **Sightlines** | indoor | Walk your windows + seating spots: what view do you love, what do you want gone, where do you feel watched? | `sightlines[]` (highlight / disguise / privacy) | [site-inventory §sightlines](../vault/concepts/site-inventory.md) |
| 8 | **Soil clues** | outdoor | *"See any rhododendrons or lavenders thriving nearby?"* — neighborhood indicator plants as the first-pass pH read; optional jar/drainage tests | `soil` — `phClue` required framing, texture/drainage optional | [gardenersworld-soil-ph](../vault/sources/gardenersworld-soil-ph.md), [soil-basics](../vault/concepts/soil-basics.md) |
| 9 | **Your site profile** | — | — | Summary card of everything captured; per-step edit links; "what this unlocks" bridge to Phase 2 (coming-soon framing) + back-links to cleanup-plan and `/sunshower` | — |

Steps are skippable and revisitable in any order after first pass (the stepper is navigation, not a gate). The sun-map step is the one designed as explicitly multi-session.

---

## Work packages

Same round structure as the GUI MVP. Agents A and B are parallel; C and D build on both.

### Round 1 — parallelizable

#### Agent A — Data layer (no UI)
- `src/app/sunshower/site-inventory/types.ts` — the contract above, verbatim unless a real problem surfaces (deviations noted here, like the GUI MVP record).
- `src/app/sunshower/site-inventory/profile.ts` — `emptyProfile()`, `loadProfile()` / `saveProfile()` (versioned, try/catch on quota + parse errors → fall back to empty), `bearingToCardinal()`, profile-completeness helper (`n of 8 steps done`).
- `src/app/sunshower/site-inventory/useSiteProfile.ts` — client hook: hydrate-after-mount pattern, debounced writes, single source of truth for all steps.
- Unit tests: `site-inventory.test.ts` (bearing→cardinal edges, version fallback, corrupt-JSON fallback).

#### Agent B — Wizard shell (UI skeleton)
- Rework `page.tsx`: keep the server component + `metadata` export as a thin wrapper; new client `Walkthrough.tsx` renders the stepper.
- Step registry (id, title, venue tag, component slot) driving: progress indicator ("3 of 8"), prev/next/skip, jump-to-any-step nav, `?step=<id>` deep-linking via `useSearchParams` (Suspense-wrapped — same pattern as cleanup-plan's `?yard=`).
- Resume behavior: on load with a non-empty profile, land on the first non-`done` step + show a "picking up where you left off" note.
- Visual vocabulary: match the existing interstitial/cleanup-plan (cream panels, serif headers, uppercase tracking labels). Renders placeholder step bodies until Round 2.
- **Mobile-first.** This flow is used phone-in-hand in the yard: 16px inputs (no iOS zoom), thumb-reachable prev/next, single-column. Desktop inherits.

### Round 2 — after A + B land

#### Agent C — Step content + inputs
- One component per step (1–8) implementing the content outline: vault-sourced copy, field-task prompt, structured inputs writing through `useSiteProfile`.
- Biggest single piece: the **sun-zone editor** (add/rename/remove zones, 5-tier select, empty-state that teaches the hourly-photo method before any zone exists).
- The archetype key as a mini flow inside step 1 (2–3 questions → result card naming the archetype, with a one-line "what this means for your plants").
- 811 as a real `tel:811` action button on step 6.
- Copy review pass against the friendly-to-natives tone before merge.

#### Agent D — Summary + integration
- Step 9: site-profile summary card (compact, scannable, per-dimension edit links, completeness state for skipped steps: "not mapped yet").
- "What this unlocks" bridge: Phase-2 coming-soon framing that names *how* the profile will be used (sun zones → sun-requirement matching, archetype → plant-community palette). No plant recommendations.
- Entry-point audit: yard-state router "mostly bare" already lands here (keep); add a pointer from cleanup-plan's §3 "Coming next" ("yard clean? map what it offers →"); check `/sunshower/care` interstitial for a natural cross-link.
- Update [phases.md](sunshower/phases.md) (site inventory currently sits under Phase 3; it's now a between-1-and-2 app surface) and the backlog item on completion.

### Explicitly deferred (fast-follows, keep on the backlog)

- Sketch/photo upload (needs the Supabase storage decision).
- Drawing canvas / zone painting (Phase-3 bed planner territory).
- Profile export (print / share / JSON download).
- Multi-yard + per-section profiles (density-sectioning direction).
- Parallel-tracks task list across cleanup + inventory (venue tags shipped here are the hook).
- Supabase `site_profiles` table + migration of localStorage profiles when auth lands.

---

## Open questions before dispatching

- **Sun-map ordering.** Step 3 takes a full day; steps 4–8 take minutes. Fine to encourage skip-and-return (the stepper allows it), or should sun-map be moved last so first-session completion feels better? Current call: keep it at 3 (it's the highest-value data) with a strong "skip for now" affordance.
- **`aspect` input friction.** Bearing-in-degrees is precise but nerdy; a "which way does your back fence face?" cardinal picker may be the better primary input with degrees as the advanced option. Agent C can decide at build time; contract supports both.
