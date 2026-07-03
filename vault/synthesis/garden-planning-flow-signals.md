---
type: synthesis
title: Garden Planning Flow — Signals from Real Gardeners' Workflows
aliases: ["planning flow signals", "planning workflow synthesis"]
tags: [garden-planning, planning-process, sunshower-features, product]
status: draft
sources: [raw/reddit/native_garden_plan.md]
last_updated: 2026-07-03
---

# Garden Planning Flow — Signals from Real Gardeners' Workflows

What a community thread of ~22 native gardeners describing their *actual* planning workflows implies for Sunshower's planning flow (see [[sources/reddit-native-garden-plan]]). This is product synthesis — the source supplies the evidence; the feature framing is the project's. Single-source for now; treat each signal as a hypothesis to corroborate, not a validated requirement.

## The headline finding

**Nobody uses a garden-planning app, and nobody misses one.** The top-voted workflows are graph paper, spreadsheets, and repurposed general software (OneNote, Google Slides, Adobe over a GIS screenshot). The two dedicated tools mentioned in the thread sit at 1 point each, one of them spam. The competition isn't other apps — it's paper and Excel. Two readings, both probably true:

1. Existing garden apps don't serve this audience (they skew vegetable-bed or generic-landscaping; none are native/ecology-first).
2. Gardeners like low-fi because plans are disposable — the community's strongest consensus is "plans always change and gardens are never finished." A tool that makes the plan feel precious or high-effort fights the culture. Sunshower should feel closer to [[concepts/bubble-drawing]] than to CAD.

## Feature signals, strongest first

### 1. The hand-built spreadsheet is Sunshower's Phase-2 selector, validated
The most detailed high-vote workflows converge on the same artifact: a color-coded spreadsheet of candidate plants, sortable by **height, bloom season ("season of show"), sociability, light, and water**. Gardeners are hand-building a filterable plant database every time, and one commenter noted that building it doubled as *learning the plants*. The planned selector over the [[sources/calscape]] `native:` frontmatter is exactly this artifact made interactive — the demand is demonstrated.

**Data gap:** every attribute in that spreadsheet already exists in plant-page frontmatter *except sociability* (how strongly a plant spreads/clumps — a Rainer-West-style rating). Worth considering as a schema addition when a source can supply it; `native.plant_type_raw` and spread habit don't quite cover it.

### 2. The planning flow the community already follows (a wizard spec)
Assembled across commenters, the shared sequence is remarkably consistent, and one commenter states it as a six-step algorithm (see [[concepts/paths-first-design]]):

1. **Base map** — county GIS / satellite screenshot for real dimensions and square footage.
2. **Site inventory** — sun per area (ideally over a season), water flow / soggy spots, utilities, existing plants worth keeping (see [[concepts/site-inventory]]).
3. **Paths and zones before plants** — desire lines, window sightlines, keyhole reach; hardscape decomposes the paralyzing blank canvas into tractable rooms (see [[concepts/paths-first-design]], [[concepts/garden-zoning]]).
4. **Sections with a phase order** — bound each work area, only clear what you can plant now (see [[concepts/phased-planting]]).
5. **Per-section plant selection** — the filterable shortlist, constrained by that section's sun/moisture labels.
6. **Bloom-coverage check** — verify something flowers in every season before buying (see [[concepts/bloom-succession]]).
7. **Quantities and shopping** — square footage ÷ spacing → plug counts; plugs bought in trays.
8. **Plant, observe, revise next year** — failure and relocation are normal, not error states.

This maps almost one-to-one onto a Sunshower onboarding flow, and steps 3–4 independently corroborate the section-by-section rollout direction (Luc, 2026-07-03). Notably, **plant selection is step 5, not step 1** — every experienced voice puts site understanding and structure ahead of picking plants. A flow that opens with a plant catalog gets the order wrong.

### 3. Bloom calendar as an early visual payoff
One gardener maintains a Google Slides deck, one slide per month, with photos of what's blooming — a manual bloom-succession storyboard. Sunshower can generate this automatically from `bloom_season:` on the user's shortlist (data already shipped for all 150 natives). Cheap to build, visually rewarding, and the ecological extension is distinctive: the same view is a **pollinator forage-gap detector** — a month with nothing blooming is a month with nothing to eat, which is the [[concepts/right-plant-right-place]] reading no aesthetic tool offers.

### 4. Curated starter kits have proven, durable demand
A statewide arboretum's plug sets — planting guide, spring/summer/fall bloom engineered in, native grasses included, 24 plants per 100 sq ft — earned 15 points, repeat purchases (five sets), and replies *a year later* still asking where to get one. Sunshower could generate "garden recipes" for South Bay conditions from data already in hand: `native.communities` for the ecological theme, `native.companions` for pairing, `bloom_season` for succession, height/spacing for the layout guide. A recipe is also the natural on-ramp for the user who finds the full selector overwhelming — kits are the "easy mode" of the same data.

### 5. Layout heuristics are encodable — as a checker, not a generator
The community's rules of thumb (see [[concepts/planting-design-heuristics]]) — tall-back/short-front, odd-number groups of 3–5, repetition for cohesion, grasses/sedges always, ephemerals in gaps, structure plants first — are simple enough to encode. Given the community's plans-are-disposable ethos, a **plan checker** ("nothing blooms in fall · no grasses in this section · 5-ft plant fronting a 1-ft plant") fits the culture better than an auto-layout generator; it leaves the human in charge of the fun part. The same commenter who built the most elaborate scale diagram admitted the spreadsheet mattered more than the drawing.

### 6. The design-education gap is Sunshower's differentiator
The most quotable insight in the thread: *"there's not much overlap between gardeners who learn about native plants and gardeners who learn about garden design… so many native plant gardens don't have a strong design"* — and messy-looking native gardens damage the movement's reputation. Sunshower sits exactly on that overlap: an ecology-first tool that bakes in just enough design guidance (borders, repetition, height order) that the output reads as intentional to neighbors. This also reinforces the friendly-to-natives tone: the pitch is "beautiful *and* alive," not "ugly but virtuous."

### 7. Iteration is a first-class state, not an edge case
"Plans are always going to change and gardens will never be finished" is the thread's top-voted sentiment. Gardeners note what failed and thrived each fall and replant. Feature implications: plans should be cheap to revise (versioned sections, not one monolithic document), and a lightweight **outcome log** (thrived / struggled / died / moved) closes the loop — next season's recommendations can weight what actually worked in *this* yard.

## What this doesn't tell us

Zone-7a East/Midwest gardeners, self-selected enthusiasts on a native-gardening subreddit — the "any yard, any experience" mainstream user is underrepresented, and the no-plan/vibes contingent (24 points!) suggests a real cohort who will never touch a wizard. The flow above should be skippable in parts, not a locked gate sequence. Corroborate against beginner-oriented sources before committing the onboarding design.

## Related

[[sources/reddit-native-garden-plan]] · [[concepts/paths-first-design]] · [[concepts/phased-planting]] · [[concepts/planting-design-heuristics]] · [[concepts/bloom-succession]] · [[concepts/site-inventory]] · [[concepts/garden-zoning]] · [[concepts/bubble-drawing]] · [[concepts/right-plant-right-place]]
