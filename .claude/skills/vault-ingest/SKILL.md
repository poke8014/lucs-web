---
name: vault-ingest
description: Ingest a raw source into the Sunshower vault wiki. Use when the user says "ingest raw/articles/foo.md", "process the new source", drops a clipped article or PDF into vault/raw/, or asks to file research into the wiki. Wraps the canonical workflow in vault/CLAUDE.md with the project judgment that isn't written there.
---

# Vault ingest

The canonical procedure is [vault/CLAUDE.md → Operations → Ingest](../../../vault/CLAUDE.md). This skill tells you how to execute it well. If this skill and vault/CLAUDE.md ever disagree, vault/CLAUDE.md wins — fix this skill.

## Before touching anything

0. Be on a task branch, never `main` (see the **start-task** skill) — vault edits merge through PRs like any other change.
1. Read [vault/CLAUDE.md](../../../vault/CLAUDE.md) in full — schema, naming, frontmatter, the whole contract.
2. Read the **last 2–3 entries of [vault/log.md](../../../vault/log.md)** (it's chronological; read the tail). Recent entries carry decisions and open threads the backlog doesn't — e.g. which schema questions were just resolved, what was deferred.
3. Check [planning/sunshower_backlog.md](../../../planning/sunshower_backlog.md) — the source you're ingesting may be a tracked 📋 item. If so, flip it to 🚧 with yourself as owner.

## The workflow (short form — full text in vault/CLAUDE.md)

1. Read the source completely.
2. **Discuss takeaways with Luc before writing** — propose what's worth filing and what isn't. This gate is real; only skip it if the request already pre-approved the filing plan.
3. Create/update the `sources/` page (see dataset exception below).
4. Update or create the entity pages the source touches (typically 5–15).
5. Cross-link forward and back.
6. Flag contradictions with a `> [!warning] Contradicts [[...]]` callout — never silently overwrite.
7. Update `index.md`, append to `log.md` (format in vault/CLAUDE.md).

## Judgment that isn't in vault/CLAUDE.md

- **Drop promo content silently.** Course/book/product promo links in clipped articles are noise — don't file them, don't surface them as a triage bucket. (Luc's standing instruction.)
- **Luc's personal yard observations are blog material, never wiki content.** If the source is his own notes about his yard, don't file it under `vault/` at all — not even `synthesis/`. Say so and stop.
- **Weed scope is "plants gardeners want out", not "Cal-IPC invasives".** Don't skip or down-rank a weed source because the plant isn't invasive-rated. (Project decision 2026-05-14; see [ops/HANDOFF.md](../../../ops/HANDOFF.md).)
- **Tone: friendly-to-natives, not aggressive-to-weeds.** A harmless residential weed must not get the urgency language of a Cal-IPC High invasive.
- **Dataset-style sources get ONE meta-page** (`sources/<source-slug>.md`), not per-record summaries — Calscape, Cal-IPC, UC IPM, WRIC all follow this. Model to copy: [vault/sources/calscape.md](../../../vault/sources/calscape.md).
- **Scope regionally (RPRP).** Default to South Bay / Santa Clara County relevance. "Ingest everything statewide" is almost always wrong — scope the candidate list first (the Calscape ingest scoped 150 taxa by San Jose lat/lng, not all of CA).
- **Don't pull extra web sources mid-ingest** — the vault is what Luc curated. Ask first.
- **`vault/raw/` is immutable.** Never edit a raw file, even for typos.

## After the ingest

- If you touched **plant-page frontmatter**, regenerate the app's derived data: `node ops/build-plant-data.mjs` (rewrites `src/data/plants.json` — commit it with your change).
- After any big ingest (≥ ~5 pages touched), run the lint: see the **vault-lint** skill.
- Bulk ingest (many pages, same shape)? Don't hand-write 50 files — write an idempotent script in `vault/scripts/` and note it in the log entry. See the **sunshower-scrape** skill for pipeline conventions.
