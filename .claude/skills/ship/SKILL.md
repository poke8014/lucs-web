---
name: ship
description: Finish and merge a unit of work in this repo — pre-merge checks, derived-data regeneration, backlog/log closeout, PR, CI watch. Use when a task is done, when the user says "ship it" or "open a PR", or before anything merges to main.
---

# Shipping

`main` auto-deploys to Vercel. Nothing merges until the checks for what you touched are green.

## 1. Checks — by what changed

| You touched | Run |
|---|---|
| `src/`, config, deps | `npm run lint && npm run typecheck && npm test && npm run build` — all four, locally, before the PR ([ops/CONTEXT.md](../../../ops/CONTEXT.md)). CI runs lint + typecheck + tests. |
| `vault/plants/*` frontmatter | `node ops/build-plant-data.mjs` — regenerates `src/data/plants.json`; commit it. Then the npm checks (the app consumes that JSON). |
| `vault/` content generally | `python3 vault/scripts/lint_vault.py` — non-zero exit means hard defects; fix before merge |
| Docs only | npm lint + typecheck still run in CI; run them locally if in doubt |

## 2. Closeout bookkeeping

- **Backlog** ([planning/sunshower_backlog.md](../../../planning/sunshower_backlog.md)): flip 🚧 → ✅ with the date, then **move the line** to the matching section of `planning/sunshower_backlog_archive.md`. Update the **Current state** paragraph if the picture changed. The backlog carries no standalone ✅ items.
- **Vault log**: if you performed a wiki operation (ingest/lint/refactor/synthesis), append the `log.md` entry per [vault/CLAUDE.md → Log format](../../../vault/CLAUDE.md).
- If your change alters an invariant or adds a decision, update [ops/HANDOFF.md](../../../ops/HANDOFF.md).

## 3. Commit, PR, merge

- Commit style: `sunshower: <what>` for Sunshower work; plain imperative otherwise. Commit only your task's paths — never `git add -A` around someone else's WIP.
- Push and open the PR: `gh pr create --base main` with what/why/how-verified in the body.
- Watch CI: `gh run list --limit 5` → `gh run watch <run-id>`. On failure: `gh run view <run-id> --log-failed`, fix locally, re-run the same local checks before pushing again.
- Merge only after CI is green. If app-facing, spot-check the Vercel deploy after merge.
