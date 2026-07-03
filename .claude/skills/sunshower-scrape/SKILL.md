---
name: sunshower-scrape
description: Plan or run a bulk source scrape for the Sunshower vault (firecrawl pipelines — Calscape, Cal-IPC, UC IPM, WRIC, or a new source). Use BEFORE running any vault/scripts/scrape_*.py or acquiring a new bulk source. Encodes the credit budget gate, licensing tiers, pilot-first discipline, and background-job rules.
---

# Bulk scrape pipelines

Every rule here was paid for once. The 150-taxa Calscape ingest cost ~273 firecrawl credits; the enrichment pass is budgeted ~283 more.

## Gate 0 — money

Firecrawl credits are real money. Before any run:

1. **Count the requests** (pages × passes). State the number.
2. **Look for a structured export or API first.** The Calscape lesson: the location-filtered Excel export carried the full 150-row × 50-column dataset in ONE request; the alternative was 150 JS-rendered page scrapes. Check for exports, sitemaps, bulk downloads, or an API before scraping pages.
3. **Confirm with Luc before any run over ~20 requests**, with the count and what it buys.

## Pipeline conventions (established across Cal-IPC, UC IPM, WRIC, Calscape)

- **Committed scripts → `vault/scripts/`.** Python, stdlib-preferred, one script per pipeline stage (scrape → parse → apply). Legacy Cal-IPC one-offs still sit in gitignored `.firecrawl/` — new work goes in `vault/scripts/`.
- **Scratch → `.firecrawl/`** (gitignored): raw firecrawl output, job TSVs, progress logs, caches. Never commit these.
- **Idempotent + resumable, always.** Skip work whose output already exists, so a re-run only fills gaps and retries failures. This is credit protection, not tidiness.
- **Pilot first.** Support `--only "<names>"` / `--limit N` flags; run 3–5 items, verify the parse holds across edge cases, then `--all`. The Calscape rollout still hit two mid-run parser bugs (a lone-`.` float crash at ~130/150, an unmapped `Fern` plant type) *after* a clean pilot — pilots shrink the blast radius, they don't remove it.
- **Scrape and parse are separate stages** with a deterministic intermediate artifact (e.g. `_extracted.json`). Re-parsing must never re-scrape (`--parse-only`).
- **Scope regionally (RPRP).** Default to Luc's region — San Jose coords `lat=37.3382,lng=-121.8863` — not statewide. Build candidate lists from regional filters before scraping.

## Licensing tiers — where scraped content may land

- **Scraped editorial prose is input for re-expression only.** Calscape's "About" text is Wikipedia-derived; it stays in gitignored scratch and is never committed verbatim to a wiki page. Hand-authored re-expressions go in the applier's input (`_prose.json` pattern).
- **Photos are two-tier.** *Research tier* (e.g. Cal-IPC images, unclear redistribution rights) lives in `vault/raw/assets/` for wiki reference only, never app-facing. *Display tier* (app-facing) must be permissively licensed (iNaturalist CC, Wikimedia) with attribution captured in `metadata.json` at fetch time.
- `vault/raw/` is immutable once committed.

## Running long jobs

- Use the Bash tool with `run_in_background: true` — the harness tracks it and re-invokes you on exit.
- **Never nest `nohup`/`&` inside a backgrounded call.** The harness can't track the inner process, and gitignored scratch written by an untracked sandboxed process is discarded on teardown. One layer of backgrounding, harness-tracked, artifacts persisted to repo paths.
- Write a progress log the resume logic can read (see `.firecrawl/calipc-scrape-progress.log` pattern).

## After the scrape

Ingest the results per the **vault-ingest** skill (dataset meta-page, index, log). If plant frontmatter changed, regenerate `src/data/plants.json` (`node ops/build-plant-data.mjs`). Then run the **vault-lint** skill.
