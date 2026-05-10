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

## Workspaces
- /src — Application code
- /ops — Deployment and operations (future use)

## Naming conventions
- Components: PascalCase
- Tests: feature-name.test.ts
