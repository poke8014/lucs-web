---
type: region
title: Central West (Jepson Region)
aliases: [CW, Central Western California, SF Bay Area (overlap), South Bay (overlap)]
tags: [region, jepson, ca-fp]
status: draft
sources:
  - raw/articles/calipc/arctotheca-prostrata-paf.md
last_updated: 2026-05-08
---

# Central West (Jepson Region)

One of the major regions of the [California Floristic Province](https://en.wikipedia.org/wiki/California_Floristic_Province) (CA-FP) as defined by the Jepson Manual. Central West (CW) covers the central California coast and inner coast ranges, roughly from southern Mendocino County south to San Luis Obispo County. The SF Bay Area, Santa Cruz Mountains, Diablo Range, and Salinas Valley all sit within CW.

This is **Luc's region** — the South Bay and San Jose foothills are in the southeastern portion of CW.

For authoritative boundaries, see the [Jepson Manual region map](http://ucjeps.berkeley.edu/Jeps_map_caliente.jpg).

## Why this region matters for the project

[[concepts/right-plant-right-place]] depends on knowing *which place* you're talking about. Jepson regions are the controlled vocabulary California botanists use for "place" at the scale that matters for native plant selection. When a plant page lists `regions:` in its frontmatter, those regions are Jepson regions.

For the Cal-IPC top-tier ingest, plants whose `invasive.jepson_regions` includes Central West are the plants most likely to actually appear in Bay Area / South Bay yards. (Plants listed only for Northwest, Mojave Desert, or Modoc Plateau are essentially not your problem.)

## Climate and habitat range

Central West spans a wide environmental gradient:

- **Coastal strip** — cool, foggy, mild winters and summers. Coastal scrub, coastal prairie, redwood forest in the wettest belts. Native drought-tolerant chaparral on south-facing exposures.
- **Inner Coast Ranges (incl. Diablo Range)** — hotter, drier, lower humidity. Oak woodland (blue oak, valley oak), chaparral, grassland.
- **South Bay valley floor** — historically grassland and oak savanna; now heavily urbanized.
- **South Bay foothills (Luc's area)** — transitional from valley floor to inner coast range. Oak woodland, chaparral, mixed evergreen forest with bay laurel and madrone. Hardiness zones 9b (valley) → 8b/9a (higher slopes).

This breadth means a plant native to "CW" may still be inappropriate for a specific microclimate within CW — coastal-prairie natives often struggle in dry foothill yards, and vice versa.

## Common invasives in Central West

(Will be expanded as the bulk Cal-IPC ingest completes. Plants confirmed so far in CW from ingested PAFs:)

- [[plants/arctotheca-prostrata]] — capeweed (primarily coastal in CW; not expected in foothills)

Per Luc's prior knowledge, common foothill invasives include the brooms (*Cytisus*, *Genista*, *Spartium*), Himalayan blackberry (*Rubus armeniacus*), English ivy (*Hedera helix*), and fennel (*Foeniculum vulgare*) — all expected in the top-tier set being ingested.

## Sub-regions worth distinguishing

For Luc's user-zero use case, CW is too coarse — within CW, the ecological reality of "South Bay foothills" is meaningfully different from "Marin coast." When the plant database matures, sub-region tagging may help (e.g., a `microclimate:` field or sub-region pages). For now, CW is the primary scale and we note coastal-vs-inland in plant body text.
