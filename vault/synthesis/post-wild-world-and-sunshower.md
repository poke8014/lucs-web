---
type: synthesis
title: "Post-Wild World → Sunshower: mapping the design theory onto the app"
aliases: ["Rainer West Sunshower mapping", "designed communities and Sunshower"]
tags: [synthesis, product, planting-design, roadmap]
status: draft
sources: [raw/pdfs/books/planting-in-a-post-wild-world.txt]
last_updated: 2026-07-03
---

# Post-Wild World → Sunshower

How Rainer & West's [[sources/planting-in-a-post-wild-world|*Planting in a Post-Wild World*]] maps onto Sunshower's product direction. The book is the closest thing the project has to a **design-theory backbone**, and it lands right on top of Luc's 2026-07-03 direction: **planting-density styles (landscaped vs. naturalistic), a section-by-section rollout, and saved plans with an outcome log.** This page is the bridge from the theory pages to those features. Companion to the community-demand synthesis in [[synthesis/garden-planning-flow-signals]] (the reddit thread findings).

## The one-line fit

The reddit community showed *what workflow gardeners actually want* (base map → inventory → paths → sectioning → **then** plants; low-fi tools; a filterable plant list). This book supplies *the design theory that fills those steps* — how to choose a goal community, how to layer and space plants, how to keep it legible, how to manage it over time. Demand + method.

## Feature-by-feature mapping

### Density styles (landscaped ↔ naturalistic)
This is the book's central spectrum, and it resolves cleanly into **two levers, not one**:

- **Sociability** ([[concepts/plant-sociability]]) — landscaped leans on low-sociability (1–2) plants in controlled groups; naturalistic leans on high-sociability (4–5) spreaders that intermingle into a matrix. *Same native palette, different grouping.*
- **Framing strength** ([[concepts/orderly-frames]]) — landscaped = more stylization + stronger frames (mown edges, hard lines, restrained height); naturalistic = looser, more intermingled, lighter frames. The density slider is largely a *frame-strength + sociability* slider.

Takeaway: the two styles are **not different plant lists** — they're different *arrangements and framing* of the same natives. That's a much smaller data problem than maintaining two palettes, and it tells us the app's style choice should drive layout/spacing/framing guidance, not filter the plant catalog.

### Per-section rollout
The book's unit of design is a single [[concepts/designed-plant-communities|community]] anchored by one [[concepts/landscape-archetypes|goal archetype]] — which is exactly a "section." The natural per-section flow:
1. Read the section's site conditions + pick a **goal archetype** (meadow / woodland-edge / etc.), mapped to a CA plant community (from Calscape `native.communities`).
2. Choose a **density style** for the section.
3. Fill the four **[[concepts/planting-layers|layers]]** with natives (structural → seasonal theme → ground cover → filler), respecting the ~50% ground-cover target.
4. Frame it and note the management plan.

### Plant categorization (app data model)
The layer system and strategy tags are natural **plant-frontmatter axes** the app can use as a *checker*:
- **Layer eligibility** — which of the four layers a native can play (a plant can serve several).
- **[[concepts/plant-sociability|`sociability`]] 1–5** — added to the schema this ingest (unset until CA values land).
- **[[concepts/plant-strategies-csr|C-S-R / Kühn type]]** — predicts behavior under competition and which layer fits.

These make the strongest demonstrated feature — a *plan checker*, not a generator (the reddit finding) — concrete. Example checks the app could run on a section:
- "This section has no ground-cover layer — 100% mid-height showy plants over bare soil will weed up." (principle 3)
- "Everything here is a low-sociability specimen — for a naturalistic look, add matrix spreaders."
- "No filler/annual layer — nothing covers the ground while the slow structural plants establish."

### Saved plans + outcome log
The book's **three [[concepts/management-not-maintenance|establishment phases]]** (plant establishment → landscape establishment → post-establishment) give the outcome log its spine. A saved plan isn't "done" at install — it moves through phases, and the log should prompt phase-appropriate check-ins:
- *Year 0–1:* is ground cover closing? Which plants died — **and why** (site feedback, the highest-value log entry)?
- *Year 1–2:* is the design emerging? Fix flopping structure / spotty cover now.
- *Ongoing:* creative management — edit aggressors, keep it legible.
"Diagnose deaths as site feedback" turns a failure into [[concepts/right-plant-right-place|RPRP]] data for the next section — a natural, valuable logging behavior.

## The seam to hold: method vs. palette

The book ranks **performance/site-fitness over nativity** and welcomes adapted exotics; Sunshower is **native-first**. We adopt its *methods* wholesale and keep our *native palette* rule. Flagged on [[concepts/right-plant-right-place]] and [[concepts/designed-plant-communities]]. Practically: when the book says "use the native equivalent of Vinca/Pachysandra/ivy as ground cover," that's a **product gap to fill** — Sunshower's job is to surface the CA-native ground covers that play that aggressive-but-non-invasive role, which the Calscape data can start to answer.

## Open questions this raises

- **Sociability values for CA natives** — the field exists but is empty; needs a CA-native design/values source, or lower-confidence inference from Calscape growth-habit data.
- **Naturalistic spacing numbers** — the book gives the *principle* (per-layer, mature-size, sociability-weighted) but its numbers are for Eastern/European species; CA-native spacing values are still a gap.
- **Layer eligibility data** — no source yet tags CA natives by which layer(s) they play; candidate for the Calscape enrichment pass or a dedicated CA-native-design source.

## Related

- [[concepts/designed-plant-communities]] · [[concepts/planting-layers]] · [[concepts/plant-sociability]] · [[concepts/plant-strategies-csr]] · [[concepts/landscape-archetypes]] · [[concepts/orderly-frames]] · [[concepts/management-not-maintenance]]
- [[synthesis/garden-planning-flow-signals]] — the community-demand side (reddit thread).
- [[concepts/right-plant-right-place]] — the native-first thesis this method serves.

## Sources

- [[sources/planting-in-a-post-wild-world]] — Rainer & West (2015). The product mapping is Sunshower synthesis; the density-style / per-section / saved-plans direction is Luc's (2026-07-03).
