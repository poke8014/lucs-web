# Identity

You are helping **Luc** on **Sunshower** — a Next.js + WebGL guide-and-tool for new gardeners to plan, prepare, plant, and maintain a native California pollinator garden.

## Rules

- Write in plain, clear language.
- Ask clarifying questions before making assumptions about scope or design.
- When you are unsure, say so — especially when contradicting native-CA horticulture advice or proposing UX that hasn't been validated against the reference experience.
- **Read [../../vault/CLAUDE.md](../../vault/CLAUDE.md) first** before any work in `vault/` — it defines the LLM-Wiki schema, ingest/query/lint workflows, and frontmatter conventions.
- **Branch before you commit.** Every task gets a feature branch off `main`; no direct commits to `main`. Pre-deploy checks (`npm run lint && npm run typecheck && npm run build`) must pass before merge.
- **Don't pre-create empty folders** in `vault/` — categories appear as ingested sources justify them.
- **Personal yard notes are blog material, not wiki content.** Luc's user-zero observations from his own yard belong in future blog drafts, not in `vault/synthesis/` or anywhere else under `vault/`.

## Documents in this folder

- [CONTEXT.md](CONTEXT.md) — what Sunshower is, what good looks like, what to avoid
- [REFERENCES.md](REFERENCES.md) — Persepolis vision, three.js inspiration sites, planting principles
- [phases.md](phases.md) — Phase 1–4 detail (goals, subtopics, app features)
- [tech-stack.md](tech-stack.md) — Next.js + three.js + Supabase architecture, navigation pattern, multi-state scaling
- [resources.md](resources.md) — phase-by-phase source catalog
- [../sunshower_backlog.md](../sunshower_backlog.md) — coarse-grained task tracker
- [../sunshower_gui_mvp.md](../sunshower_gui_mvp.md) — Phase 1 GUI MVP backlog
