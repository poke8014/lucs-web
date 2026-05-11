# Personal Brand Website
Luc's Web — landing page for future software employers and massage clients, and home for **Sunshower** (active project — native CA pollinator garden app).

## Tech Stack
- Frontend: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS
- Deploy: Vercel

## Folder Structure
```
/ { .github/workflows, archive, ops, planning, public, src, vault }
```

## Sites
- **/** — Landing page: about me + index of active projects
- **/tangtherapeutics** — Tang Therapeutics massage business: services, booking, about
- **/sunshower** — Pollinator garden project hub (scene + planning tools)
  - **/sunshower/cleanup-plan** — Weed identification + removal planner

Each site is a regular App Router segment under `src/app/`. Per-segment layouts (e.g. [src/app/tangtherapeutics/layout.tsx](src/app/tangtherapeutics/layout.tsx), [src/app/sunshower/layout.tsx](src/app/sunshower/layout.tsx)) scope fonts and metadata to that segment.

## Active Project — Sunshower
Native California pollinator garden planning tool.

- **Project home:** [planning/sunshower/](planning/sunshower/) — start with [CONTEXT.md](planning/sunshower/CONTEXT.md). Identity/rules in [CLAUDE.md](planning/sunshower/CLAUDE.md), visual + UX inspiration in [REFERENCES.md](planning/sunshower/REFERENCES.md). The original single-file outline at [planning/sunshower.md](planning/sunshower.md) is now a thin router.
- **Knowledge base:** `vault/` is an LLM-maintained wiki built on [Karpathy's LLM Wiki pattern](vault/llm-wiki.md) — immutable raw sources in `vault/raw/`, wiki pages I write and maintain, conventions in [vault/CLAUDE.md](vault/CLAUDE.md). **When working in the vault, read [vault/CLAUDE.md](vault/CLAUDE.md) first** — it defines the ingest/query/lint workflows and frontmatter schemas.
- **Stack additions (planned):** Supabase (Postgres) seeded from plant-page frontmatter for structured queries, Mapbox/Leaflet for the native range map. The wiki is the research layer; the app reads structured data derived from it (not the raw markdown directly). See [planning/sunshower/tech-stack.md](planning/sunshower/tech-stack.md).

## Workspaces
- /planning — Specs and outlines for active projects
- /vault — Obsidian knowledge base (pollinator garden content)
- /src — Application code
- /ops — Deployment and operations (future use)

## Workflow
- **Always start backlog/feature work on a fresh branch off `main`.** Before editing, check `git status` and `git branch --show-current`: if the current branch is already merged, stale, or unrelated to the new task, create a new one (`feat/…`, `fix/…`, `chore/…`). Never reuse a merged branch or pile unrelated work onto an existing one. Full strategy in [ops/CONTEXT.md](ops/CONTEXT.md#branching-strategy).

## Naming conventions
- Components: PascalCase
- Tests: feature-name.test.ts
- Wiki pages: see [vault/CLAUDE.md](vault/CLAUDE.md) for filename and frontmatter conventions
