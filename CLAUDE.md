# Personal Brand Website
Luc's Web - Landing page for future software employers and massage clients
Temporary hosting page for scrapaholic - a verification engine where users can compare products,
customer reviews and view third party data such as lab results and FDA information

## Tech Stack
- Frontend: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS
- Deploy: Vercel

## Folder Structure
```
/ { .github/workflows, planning, docs, ops, scripts, fixtures, prisma, src, public }
```

## Sites
- **(personal)** — Portfolio for software employers: projects, skills, contact
- **(massage)** — Client-facing massage business: services, booking, about
- **scrapaholic** — Clinical product verification engine: compare supplements via trust scoring, Reddit sentiment, and FDA/PubMed data

Route groups `(personal)` and `(massage)` share the root layout but have independent pages, layouts, and components nested within each group. `scrapaholic` is a standalone route at `/scrapaholic`.

## Scrapaholic
- **Backlog:** planning/scrapaholic_backlog.md
- **Roadmap:** planning/ROADMAP.md
- **LLM:** Gemini 2.5 Flash (free tier for MVP)
- **APIs:** Firecrawl, Apify (Reddit scraping), FDA (api.fda.gov), NCBI/PubMed
- **Env vars:** see .env.example

## Workspaces
- /planning — Specs, architecture, decisions
- /src — Application code
- /scripts — Ad-hoc test and dev scripts (Firecrawl, Apify Reddit, DB, extraction)
- /docs — Documentation and API references
- /ops — Deployment and operations (future use)

## Routing
| Task | Go to | Read | Skills |
|------|-------|------|--------|
| Plan or add to backlog | /planning | CONTEXT.md | — |
| Execute a task | /src | CONTEXT.md | testing-skill |
| Deploy or debug | /ops | CONTEXT.md | — |
| After a significant push | /docs | CONTEXT.md | doc-authoring-skill |

## Naming conventions
- Specs: feature-name_spec.md
- Components: PascalCase
- Tests: feature-name.test.ts
- Decision records: YYYY-MM-DD-decision-title.md