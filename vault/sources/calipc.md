---
type: source
title: Cal-IPC Inventory (dataset)
aliases: [California Invasive Plant Council, Cal-IPC]
tags: [dataset, invasives]
status: stable
sources: []
last_updated: 2026-05-08
---

# Cal-IPC Inventory

The [California Invasive Plant Council](https://www.cal-ipc.org/) (Cal-IPC) is a non-profit, founded 1992, that maintains the canonical assessment of invasive plants in California's wildlands. Their **Inventory** — at <https://www.cal-ipc.org/plants/inventory/> — is a science-based, expert-reviewed catalog of plants that threaten or are at risk of threatening CA natural areas. The Inventory has no regulatory authority but is the reference body of work for ecological invasiveness in the state.

## What we ingested

Top-tier subset only, scraped 2026-05-08 to `raw/articles/calipc/`:

- **44 plants rated "High"** — severe ecological impacts, widely distributed
- **93 plants rated "Moderate"** — substantial-to-moderate ecological impacts
- 137 plants total × 2 documents each (profile + PAF) = 274 raw markdown files

**Deferred** (will be future scrape passes):
- 89 "Limited" rated plants (PAFs)
- 105 "Watch" plants (PRE — Plant Risk Evaluation, different document format)
- Per-plant photo downloads
- UC Davis WRIC (Weed Research and Information Center) management notes — Cal-IPC profiles link out to WRIC for short-term/long-term removal guidance, since PAFs explicitly do not include management information.

## Document types

Each Cal-IPC plant has up to two documents:

**Profile page** — `/plants/profile/<name>-profile/`
- Identity (synonyms, common names)
- Short description paragraph
- Cal-IPC and CDFA ratings
- Links to assessment, weed-management notes (if any), CalPhotos, Calflora, CalWeedMapper, EDDMapS, Jepson Interchange
- Photos (URLs only — we did not download)

**Plant Assessment Form (PAF)** — `/plants/paf/<name>-plant-assessment-form/`
- Inventory plants only (Watch plants get PRE instead — deferred)
- Three-section scoring: Impact, Invasiveness, Distribution (Section 1, 2, 3)
- Per-criterion scores with cited sources
- Worksheet A (innate reproductive potential)
- Worksheet C (California ecological types)
- Infested Jepson Regions

## Scoring vocabulary

See [[concepts/cal-ipc-scoring]] for the rating system.

## Ingested raw files

Raw scrapes live at `raw/articles/calipc/<scientific-name>-profile.md` and `raw/articles/calipc/<scientific-name>-paf.md`. Each plant page in `plants/` references its raw files in the `sources:` frontmatter field — the raw files are the primary records; this meta-page describes the dataset they're drawn from.

## Limitations

- **PAFs can be dated.** Many evaluations are from the early-to-mid 2000s. New evidence may have emerged on individual species.
- **Management content is absent from the PAF by design.** Cal-IPC's assessment evaluates *whether* a plant is invasive, not how to control it. For management, see WRIC (deferred).
- **Inventory has no regulatory authority** — for legal weed status, see CDFA ratings.
- **Coastal bias** — many of the listed invasives concentrate in coastal habitats. For inland regions like the South Bay foothills, the relevant subset is smaller than the headline 137.
