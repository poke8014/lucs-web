# Personal Brand Website
Luc's Web — landing page for future software employers and massage clients.

## Tech Stack
- Frontend: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS
- Deploy: Vercel

## Folder Structure
```
/ { .github/workflows, archive, ops, prisma, src, public }
```

## Sites
- **(personal)** — Portfolio for software employers: projects, skills, contact
- **(massage)** — Client-facing massage business: services, booking, about

Route groups `(personal)` and `(massage)` share the root layout but have independent pages, layouts, and components nested within each group.

## Archived
- **scrapaholic** — Clinical product verification engine. Archived 2026-05-07; not under active development. Planning, docs, scripts, and fixtures live under `archive/scrapaholic/`. The `/scrapaholic` route, API handlers, lib modules, and Prisma schema remain in `src/` and `prisma/` so the live subdomain (`scrapaholic.lucttang.dev`) keeps serving — do not pick up new work on this project unless explicitly asked.

## Workspaces
- /src — Application code
- /ops — Deployment and operations (future use)
- /archive — Archived projects (currently: scrapaholic)

## Naming conventions
- Components: PascalCase
- Tests: feature-name.test.ts
