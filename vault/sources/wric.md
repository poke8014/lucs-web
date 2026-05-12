---
type: source
title: WRIC Weed Reports (dataset)
aliases: [Weed Research and Information Center, UC Davis WRIC, Weed Control in Natural Areas]
tags: [dataset, invasives, removal]
status: stable
sources: []
last_updated: 2026-05-11
---

# WRIC Weed Reports

The [UC Davis Weed Research and Information Center](https://wric.ucdavis.edu/) (WRIC) publishes per-genus *Weed Reports*, excerpted from the book:

> DiTomaso, J.M., G.B. Kyser et al. 2013. *Weed Control in Natural Areas in the Western United States.* Weed Research and Information Center, University of California. 544 pp.

WRIC is the source [[sources/calipc]] points to whenever a profile says "for management information, see WRIC." Cal-IPC Plant Assessment Forms explicitly do not include management; WRIC is the canonical management layer.

## What we ingested

**274 PDFs** covering A–Z (no K/Q/Y) genera of natural-area weeds, scraped 2026-05-11 via firecrawl → `vault/raw/articles/wric/<PdfName>.md`. The original PDFs sit at [`vault/raw/pdfs/wric/`](../raw/pdfs/wric/) (7 files, downloaded in the 2026-05-08 pass) and the rest are accessible via the Box archive recipe in [`raw/pdfs/wric/_index.md`](../raw/pdfs/wric/_index.md).

The Box viewer URL pattern returns a JS-app HTML shell. The working download pattern that firecrawl-scrape parses is:

```
https://ucdavis.box.com/index.php?rm=box_download_shared_file&shared_name=t266vkfh1ym7bb7j57k5ufkrv9vrby3v&file_id=f_<NUMERIC_ID>
```

This 302s to a short-lived `public.boxcloud.com` content URL with `Content-Type: application/pdf`, which firecrawl-scrape parses to markdown for 1 credit per PDF. Script: [`vault/scripts/scrape_wric.py`](../scripts/scrape_wric.py).

## Document structure

Each WRIC PDF is a per-genus *Weed Report* with a consistent template:

1. **Species, family, common names** at the top.
2. **Narrative section** (longer PDFs only) — range, habitat, origin, impacts, listing status (USDA noxious-weed lists, Cal-IPC rating), morphology, reproductive biology.
3. **Non-chemical control table** — Cultural / Mechanical / Biological rows rated `E` (excellent, >95%), `G` (good, 80–95%), `F` (fair, 50–80%), `P` (poor, <50%), or `NIA` (no information). Brief justification per row.
4. **Chemical control table** — herbicides grouped by mode of action, with rate, timing, and remarks per herbicide.
5. **Recommended citation** at the bottom.

Short PDFs (e.g. `Acacia.pdf`) skip the narrative and are table-only. Long PDFs (e.g. `Acroptilon.pdf`) include the full narrative and run several pages.

Some PDFs cover multiple congeners that share management notes:

- `Bromus_diandrus-madritensis-tectorum.pdf` — all three annual bromes
- `Cortaderia_jubata-selloana.pdf` — both pampasgrasses
- `Cytisus.pdf` — *C. scoparius* + *C. striatus*
- `Hedera_canariensis-helix-hibernica.pdf` — all three ivies
- `Hordeum_marinum-murinum.pdf` — both Hordeum invasives
- `Dipsacus_fullonum-laciniatus-sativus.pdf` — three teasels
- `Carduus_acanthoides-nutans-pycnocephalus-tenuiflorus.pdf` — four Carduus thistles
- `Avena_barbata-fatua.pdf` — both wild oats

## How the app cites this

[`plants.json`](../../src/data/plants.json) records `removal_sources: string[]` per plant. Citation slugs follow the pattern `wric/<PdfStem>` and resolve to `vault/raw/articles/wric/<PdfStem>.md`. App-side, the cleanup plan can render this as "Source: WRIC notes on *<species>*" with a link to the markdown.

The 38 yard-relevant plants annotated in this PR cite WRIC directly (35 plants), via a congener (1 plant: *Acacia dealbata* uses notes for *A. melanoxylon*), or carry no WRIC source at all (1 plant: *Oncosiphon pilulifer* / stinknet — post-dates the 2013 source book). The remaining 99 of 137 Cal-IPC plants carry an empty `removal_sources: []` until annotated.

## Citation

Always include the recommended citation when surfacing WRIC content to users:

> DiTomaso, J.M., G.B. Kyser et al. 2013. *Weed Control in Natural Areas in the Western United States.* Weed Research and Information Center, University of California. 544 pp.

## Deferred

- **Per-genus wiki pages.** The 274 markdown files currently sit in `raw/`. Wiki pages summarizing each report (and linking to plant pages) follow the dataset-source exception in [vault/CLAUDE.md](../CLAUDE.md): one meta-page (this file) covers the whole dataset; per-plant pages list their WRIC source in frontmatter.
- **PDF text in `raw/pdfs/wric/`.** The 7 PDFs locally downloaded on 2026-05-08 are kept for archival; the markdown derived via firecrawl is the practical working source.
- **Per-region timing.** WRIC notes give national/western-states guidance. Per-region (Bay Area, foothills) timing is not currently extracted into `plants.json`; that's a follow-up when `removal_timing` is added to the schema.
