---
type: concept
title: Cal-IPC Scoring System
aliases: [Cal-IPC ratings, PAF scoring]
tags: [vocabulary, invasives, calipc]
status: draft
sources:
  - raw/articles/calipc/arctotheca-prostrata-paf.md
last_updated: 2026-05-08
---

# Cal-IPC Scoring System

Vocabulary page for the rating system used in [[sources/calipc]] Plant Assessment Forms (PAFs). Used as `invasive.impact_score`, `invasive.invasiveness_score`, `invasive.distribution_score`, and `invasive.cal_ipc_rating` in plant page frontmatter.

## Three sections, each scored A–D

Every PAF assesses a plant on three independent axes. Each section's overall score is rolled up from sub-criteria.

| Section | What it measures |
|---------|------------------|
| **1. Impact** | Damage the plant does where it has invaded — to abiotic processes, plant communities, higher trophic levels, and genetic integrity |
| **2. Invasiveness** | How aggressively the plant spreads — disturbance dependency, rate of spread, reproductive potential, dispersal mechanisms, behavior in other regions |
| **3. Distribution** | How widely the plant currently occupies California — ecological amplitude and peak frequency |

Each section produces a four-step letter score:

- **A** = Severe / High / Widespread (worst)
- **B** = Moderate
- **C** = Minor / Low
- **D** = None / Insignificant (best)

A plant's **PAF score fingerprint** is the triple `<Impact>/<Invasiveness>/<Distribution>` — e.g., capeweed is `B/B/B`. Some plants are documented with a four-letter Impact sub-score like `BBBD` (one per Section 1 criterion). Both forms appear in PAF Table 2.

## Overall rating (the headline)

The three section scores roll up to a single **Overall Rating** that the Inventory headlines:

| Rating | Meaning |
|--------|---------|
| **High** | Severe ecological impacts, aggressive spread, often widely distributed |
| **Moderate** | Substantial-to-moderate impacts; aggressive spread or wide distribution but not both at the high end |
| **Limited** | Invasive but with minor or localized impact, OR aggressive in narrow habitats |
| **Watch** | Not currently invasive in CA — assessed as high-risk for future invasiveness (uses PRE form, not PAF) |
| **Alert** | Reserved for plants posing immediate intervention need |

We ingested the **High** and **Moderate** tiers as our top-tier set (137 plants).

## Worksheet C habitat coding

A separate scoring axis on every PAF: where in California the plant has been documented. Habitats are listed (coastal prairie, coastal scrub, riparian, etc.) and each is coded:

- **A** = Widespread (>50%)
- **B** = (no formal middle code in most PAFs — gap)
- **C** = 5–20% present
- **D** = <5% present
- (blank) = not documented in this habitat

Used in `invasive.habitat_types` frontmatter — we list any habitat where the plant has any presence (coded A, B, C, or D).

## Worksheet A reproductive potential

Counts a plant's "yes" answers across nine reproductive traits (rapid maturity, prolific seed, sustained seed production, long-viable seed bank, self+cross compatibility, vegetative spread, fragmentation, resprouting). Total score rolls up to a single A–D feeding section 2.4 (innate reproductive potential).

## Source documentation per criterion

Every per-criterion score in a PAF must cite its evidence: **Reviewed Scientific Publication > Other Published Material > Observational > Anecdotal**. The "Documentation" total (out of 5) reflects the strength of evidence behind the assessment.

## Reference

Official criteria: [Cal-IPC Criteria for Categorizing Invasive Non-Native Plants that Threaten Wildlands](http://cal-ipc.org/paf/static.docs/Criteria.pdf).
