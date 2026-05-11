# Personal Brand Website
Luc's Web — landing page for future software employers and massage clients, and home for the **Pollinator Garden App** (active project).

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

## Active Project — Pollinator Garden App
Native California pollinator garden planning tool.

- **Outline:** `planning/pollinator_garden_app.md`
- **Knowledge base:** `vault/` is an LLM-maintained wiki built on [Karpathy's LLM Wiki pattern](vault/llm-wiki.md) — immutable raw sources in `vault/raw/`, wiki pages I write and maintain, conventions in [vault/CLAUDE.md](vault/CLAUDE.md). **When working in the vault, read [vault/CLAUDE.md](vault/CLAUDE.md) first** — it defines the ingest/query/lint workflows and frontmatter schemas.
- **Stack additions (planned):** Supabase (Postgres) seeded from plant-page frontmatter for structured queries, Mapbox/Leaflet for the native range map. The wiki is the research layer; the app reads structured data derived from it (not the raw markdown directly).

## Workspaces
- /planning — Specs and outlines for active projects
- /vault — Obsidian knowledge base (pollinator garden content)
- /src — Application code
- /ops — Deployment and operations (future use)

## Naming conventions
- Components: PascalCase
- Tests: feature-name.test.ts
- Wiki pages: see [vault/CLAUDE.md](vault/CLAUDE.md) for filename and frontmatter conventions
