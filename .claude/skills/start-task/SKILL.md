---
name: start-task
description: Start any new unit of work in this repo — feature, fix, ingest, docs, refactor. Use at the beginning of a work session or when picking up a backlog item, BEFORE editing any file. Enforces branch hygiene, backlog pickup protocol, and points you at the right context docs for the task type.
---

# Starting a task

## 1. Branch hygiene (before any edit)

```
git status && git branch --show-current
```

- **Never work on `main`.** It auto-deploys to Vercel and must stay shippable.
- **Never reuse a merged or unrelated branch.** If the current branch isn't *this* task's branch, make a fresh one off up-to-date main: `git fetch origin main && git checkout -b <prefix>/<kebab-slug> origin/main`.
- Prefixes: `feat/`, `fix/`, `chore/`, `docs/`.
- **Uncommitted changes from someone else's task?** Don't stash or discard them. If the current tip equals main's tip, branching in place is safe (the WIP rides along untouched — just never `git add` those paths). Otherwise stop and ask Luc.

Full strategy: [ops/CONTEXT.md → Branching Strategy](../../../ops/CONTEXT.md).

## 2. Backlog pickup (Sunshower work)

[planning/sunshower_backlog.md](../../../planning/sunshower_backlog.md) is the coordination surface:

- Flip the item 📋 → 🚧 and name yourself as owner.
- If your pickup changes the big picture, update the **Current state** paragraph at the top.
- Backlog ≠ vault log: the backlog is the plan; `vault/log.md` records wiki operations.

## 3. Read the right context first

| Task touches | Read first |
|---|---|
| Anything (orientation) | [ops/HANDOFF.md](../../../ops/HANDOFF.md) — invariants + decision index |
| `vault/` | [vault/CLAUDE.md](../../../vault/CLAUDE.md) — non-negotiable — plus tail of `vault/log.md` |
| Sunshower app or planning | [planning/sunshower/CLAUDE.md](../../../planning/sunshower/CLAUDE.md) then [CONTEXT.md](../../../planning/sunshower/CONTEXT.md) |
| Bulk scraping | **sunshower-scrape** skill |
| Deploy / CI / env | [ops/CONTEXT.md](../../../ops/CONTEXT.md) |

## 4. Conventions

- Commit messages for Sunshower work take the `sunshower: <what>` prefix (see `git log --oneline` for the pattern). Other work: plain imperative subject.
- When the task is done, close it out properly — see the **ship** skill.
