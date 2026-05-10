---
type: concept
title: Sun Requirements
aliases: ["sun exposure", "full sun", "part sun", "shade", "sun levels"]
tags: [sun, plant-selection, plant-care, general-gardening]
status: draft
sources: [raw/articles/design-a-garden-layout.md, raw/articles/flower-gardening-for-beginners.md]
last_updated: 2026-05-08
---

# Sun Requirements

The amount of direct sunlight a plant needs each day to grow and flower well. The plant-side counterpart to the sun-mapping work that happens during a [[concepts/site-inventory]].

A successful planting matches the plant's sun requirement to the sun the site actually delivers. Mismatch is one of the most common reasons new gardeners' plants fail to thrive — a sun-loving plant in shade gets leggy and refuses to flower; a shade-loving plant in full sun scorches.

## The three categories

The terminology is consistent across the sources ingested so far:

| Category | Direct sun per day | Notes |
|---|---|---|
| **Full sun** | ≥ 6 hours | The hours don't have to be continuous; morning + afternoon counts as long as it totals 6+. |
| **Part sun / part shade** | 3 – 6 hours | Some sources split "part sun" (more sun-leaning) from "part shade" (more shade-leaning). For frontmatter purposes one bucket is sufficient unless a source forces a finer distinction. |
| **Shade** | ≤ 3 hours | "Full shade" sometimes means *no* direct sun but bright indirect light. "Deep shade" means low light all day — far fewer plants tolerate this. |

These thresholds are **rule-of-thumb** — published plant tags use the same vocabulary but the boundaries blur in practice. A "part sun" plant in a hot inland zone may need afternoon shade; the same plant on the foggy coast may handle full sun.

## What "direct sun" means

Direct sun = unshaded sun reaching the plant. The clock matters too:
- **Morning sun** is gentler. Many "part shade" plants tolerate full morning + afternoon shade.
- **Afternoon sun** in inland California is the harshest. Hot-afternoon exposure can stress plants rated for full sun in milder climates.

This means **a yard's sun map is not just hours-per-day** — it's hours-and-when. The pollinator app's sun input should accept timing, not just a total.

## Maps to plant frontmatter

The schema's plant `sun:` field uses values `full | part | shade`, matching the three categories above. For California natives specifically, the `regions:` field will modulate this — a "full sun" plant in coastal sage scrub may need part sun if planted in inland-valley zone 9b heat.

## Relationship to other concepts

- **Site side:** [[concepts/site-inventory]] sun-mapping captures what the *yard* delivers (which areas get how many hours of sun, when).
- **Plant side:** this page captures what the *plant* needs.
- **The match between the two** is one axis of [[concepts/right-plant-right-place]].

## Sources

- [[sources/design-a-garden-layout]] — Amy Fedele (2023). Introduces sun-mapping during site inventory; defines full sun (≥6h) and full shade (<3h).
- [[sources/flower-gardening-for-beginners]] — Amy Fedele (2020). Adds part-sun (3-6h) middle category. Otherwise consistent.
