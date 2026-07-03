---
name: vault-lint
description: Run the Sunshower vault lint pass — after any big ingest, before merging a vault-heavy branch, or when the user says "lint the wiki" or "lint the vault". Combines the automated script with the manual checks the script can't do, and tells you which findings are known accepted debt.
---

# Vault lint

Two layers: a script for the mechanical checks, you for the semantic ones. Canonical check list: [vault/CLAUDE.md → Operations → Lint](../../../vault/CLAUDE.md).

## 1. Run the script

```
python3 vault/scripts/lint_vault.py
```

Read-only. Covers: orphans (strict + graph), stub counts, index drift, frontmatter violations, unresolved contradiction callouts. Exits non-zero on hard defects (broken index wikilink, frontmatter violation, unresolved contradiction) so it can gate CI later.

## 2. Manual checks the script can't do

- **Stale claims** — claims contradicted by newer ingested sources.
- **Missing entity pages** — proper nouns mentioned repeatedly across pages with no page of their own.
- **Upgrade-ready stubs** — `status: stub` pages that have quietly accumulated enough sourced content to be `draft`.

## 3. Interpret against known debt — don't re-report it

Baseline as of 2026-07-02 (tracked in [planning/sunshower_backlog.md](../../../planning/sunshower_backlog.md) → *Schema / wiki maintenance* and *Native plant ingest*):

- **~285 graph-orphans** (150 Calscape natives + ~135 invasives reachable only from index.md). Known. The natives' fix rides the Calscape enrichment scrape (companions graph + region hub); the invasives' de-orphaning path is a backlog item. Report the **delta**, not the baseline.
- **150 natives with `regions: []`** and only `regions/central-west.md` existing. Known; rides the enrichment pass.
- **~255 stubs** (natives awaiting enrichment + invasive stubs). Expected at this phase.

If your numbers move against this baseline, that's the finding.

## 4. Output discipline

- Produce a **punch list; do not auto-fix.** Propose fixes and wait for direction (vault/CLAUDE.md rule).
- If a fix is approved and mechanical across many pages, **script it** (idempotent, committed to `vault/scripts/`) — never hand-edit 150 files.
- Append a `lint` entry to [vault/log.md](../../../vault/log.md) (format in vault/CLAUDE.md) recording scope, findings, and what was fixed. See the 2026-05-17 lint entry there for a model.
