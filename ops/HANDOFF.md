# Architect's Handoff

Orientation for any agent working in this repo. Read this before your first edit; it is the judgment layer — the *why* behind the rules the other docs state. Facts here were true as of **2026-07-02**; where this file and a dated doc disagree, trust the newer one and fix the older.

## Orient by task

| Task | Read, in order |
|---|---|
| Any Sunshower work | [planning/sunshower/CLAUDE.md](../planning/sunshower/CLAUDE.md) → [CONTEXT.md](../planning/sunshower/CONTEXT.md) → [backlog "Current state"](../planning/sunshower_backlog.md) |
| Vault (wiki) work | [vault/CLAUDE.md](../vault/CLAUDE.md) — non-negotiable — then the tail of [vault/log.md](../vault/log.md) |
| App code | [src/CONTEXT.md](../src/CONTEXT.md) |
| Deploy / CI / branching | [ops/CONTEXT.md](CONTEXT.md) |

Recurring workflows are packaged as project skills in [.claude/skills/](../.claude/skills/): **start-task**, **vault-ingest**, **vault-lint**, **sunshower-scrape**, **ship**. Use them — they encode the failure modes below.

## Invariants — do not break these

1. **`main` is always shippable.** Vercel auto-deploys it. Every task gets a fresh branch off `main`; no direct commits ([ops/CONTEXT.md](CONTEXT.md)).
2. **`vault/raw/` is immutable.** Read, never write — not even typo fixes. It's the evidence tier; wiki pages cite into it.
3. **Plant-page frontmatter is the canonical schema.** `src/data/plants.json` is *derived* (`node ops/build-plant-data.mjs`) and the future Supabase tables will be derived the same way. Never hand-edit `plants.json`; regenerate it whenever plant frontmatter changes — **one command, no post-steps** (since 2026-07-06). Historical: the cleanup-plan removal fields used to be a post-build overlay from four Python appliers, and a bare build run silently wiped them; that data now lives in each weed page's `removal:` frontmatter block (schema in vault/CLAUDE.md) and the appliers are deleted. If you see applier references in older docs/log entries, they're historical record, not instructions.
4. **No preemptive taxonomy.** Vault folders and region/concept pages appear when a source justifies them, never "for later."
5. **Scraped prose is input, not content.** Bulk-scraped editorial text (e.g. Calscape's Wikipedia-derived "About") stays in gitignored `.firecrawl/` scratch; wiki pages get hand-authored re-expressions. Photos are two-tier: research (rights unclear, wiki-only) vs display (permissive license + attribution, app-facing).
6. **Firecrawl credits are money.** Estimate request count, prefer structured exports over page scrapes, confirm with Luc above ~20 requests (**sunshower-scrape** skill).
7. **Luc's personal yard notes never enter `vault/`.** They're future blog material.
8. **v1 is CA-only, data is South Bay-scoped.** Resist "for other states later" data-model decisions and statewide ingest completionism ("RPRP scoping").

## Decisions and why

| Decision | Why | Detail |
|---|---|---|
| Weed scope = *all* plants a gardener wants out, not just Cal-IPC invasives | The average gardener doesn't sort by invasive-rated vs not; the tool must meet them where they are (2026-05-14) | backlog → *Common weed ingest* |
| Tone: friendly-to-natives, not aggressive-to-weeds | The classification (invasive / common weed / native) is the lever; a harmless weed must not carry Cal-IPC-High urgency language | [planning/sunshower/CONTEXT.md](../planning/sunshower/CONTEXT.md) |
| "Right plant, right place" read *ecologically* | Native plants supporting co-evolved native pollinators — not just horticultural fit. This is the project thesis | [vault/concepts/right-plant-right-place.md](../vault/concepts/right-plant-right-place.md) |
| Dataset sources get one meta-page, not per-record summaries | 150 per-record source pages would be noise; the meta-page carries methodology + scoring vocab once | [vault/CLAUDE.md](../vault/CLAUDE.md) → file naming |
| `native:` / `invasive:` as parallel frontmatter blocks, flat fields as coarse convenience | The Phase-2 selector queries the structured block; flat `sun`/`water` stay simple for casual filtering. Approved by Luc 2026-05-17 | [vault/CLAUDE.md](../vault/CLAUDE.md) schema; [vault/sources/calscape.md](../vault/sources/calscape.md) |
| Cultivars: `native.is_cultivar` flag, species page canonical | Cultivars often have reduced pollinator value; they must be distinguishable without page-count explosion | [vault/sources/calscape.md](../vault/sources/calscape.md) |
| Stub-first programmatic pages, then enrichment passes | 150 consistent stubs from one export beat 150 hand-written pages; enrichment upgrades stub→draft in bulk | vault/log.md 2026-05-17 entries |
| Disturbed-soil weeds are a *pattern*, not 6 separate facts | Knotweed, puncturevine, Russian thistle etc. signal compaction/disturbance; the upstream fix is structural, not herbicide. Queued as a future concepts page | backlog → *Common weed ingest* 🧊 |
| Scripts: committed pipelines in `vault/scripts/`, scratch in `.firecrawl/` | Pipelines must be re-runnable by successors; raw scrape output and job files must never bloat the repo | **sunshower-scrape** skill |
| Site profile: versioned localStorage (`sunshower.siteProfile.v1`), no auth dependency | The walkthrough must work before Supabase exists; `version` gates migrations and the shape maps 1:1 to a future `site_profiles` table (2026-07-04) | [planning/sunshower_site_inventory_mvp.md](../planning/sunshower_site_inventory_mvp.md) |
| Unit tests via vitest (`npm test`), colocated `*.test.ts`, in CI | First test runner in the repo (2026-07-04); pure-logic modules (profile helpers) get tests, UI verification stays manual for now | `src/app/sunshower/site-inventory/site-inventory.test.ts` |

## State of play (2026-07-02)

Canonical, maintained status lives in the **Current state** paragraph of [planning/sunshower_backlog.md](../planning/sunshower_backlog.md). Snapshot: Phase 1 (Cleanup) closed 2026-05-18; Phase 2 data layer live (150 Calscape native stubs, PR #19).

**In flight, uncommitted** (invisible to the backlog): branch `feat/calscape-enrichment` holds `vault/scripts/scrape_calscape_enrichment.py` (new) + a small `build_calscape_plant_pages.py` tweak — the per-species enrichment scrape (editorial prose for re-expression + named lep hosts; ~283 credits budgeted; pilot before `--all`). The scrape/parse stage emits `_extracted.json`; the *applier* stage it feeds (and the hand-authored `_prose.json` it consumes) is **not written yet** — don't go hunting for it. The region-hub cross-link for the 150 natives rides this pass, and the shipped pages' stale `# PROPOSED schema block` comment (approved 2026-05-17, comment never updated) should be dropped by the same regeneration. Then: Phase-2 selector design (model captured in [vault/sources/calscape.md](../vault/sources/calscape.md)).

## Gotchas that bit us

- **Pilot runs don't catch everything.** The Calscape `--all` rollout hit a lone-`.` float-parse crash at ~130/150 and an unmapped `Fern` plant type *after* a clean 6-taxon pilot. Keep pipelines resumable so a mid-run abort costs nothing.
- **`vault/index.md`'s natives catalog is regenerated programmatically** by `build_calscape_plant_pages.py` — don't hand-sync those sections; re-run the script.
- **Backgrounded jobs:** one layer only, harness-tracked. Nesting `nohup`/`&` inside a backgrounded call orphans the process, and its gitignored scratch dies with the sandbox.
- **`lint_vault.py` exits non-zero on hard defects** — safe to wire into CI later; don't "fix" that behavior.
- **Schema enums are closed.** `plant_type` has no `fern` — Calscape's `Fern` maps to `perennial` with the truth kept in `native.plant_type_raw`. Extend enums deliberately (schema doc + build script + lint), not ad hoc.
- **Known lint debt is tracked, not news:** ~285 plant graph-orphans + `regions: []` on the 150 natives (see **vault-lint** skill baseline). Report deltas.
- **The removal-overlay regen chain is gone (2026-07-06).** The 61 cleanup-plan removal records used to be injected by four post-build Python appliers, and a bare `build-plant-data.mjs` run wiped them. They were migrated into `removal:` frontmatter blocks the same week the footgun was found (migration verified byte-identical against the applied overlay); `lint_vault.py` §6 now validates block shape. One build command is the whole regen.
