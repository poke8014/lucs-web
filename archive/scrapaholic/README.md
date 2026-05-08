# Scrapaholic Archive

**Status:** Archived 2026-05-07. Active development has stopped.

Scrapaholic was a clinical product verification engine that compared supplements
via trust scoring, Reddit sentiment, and FDA/PubMed data. The MVP reached the
certification scrapers and FDA adverse-events lookup before being shelved.

## Live components (NOT in this archive)

These remain in the main tree because the `/scrapaholic` route still serves on
`scrapaholic.lucttang.dev`:

- `src/app/scrapaholic/` — UI route, components, login page
- `src/app/api/{analyze,products,scrapaholic-auth}/` — API routes
- `src/lib/{firecrawl,apify-reddit,gemini,sentiment,fda,certifications/*}.ts`
- `src/lib/schemas/` — Zod schemas
- `src/middleware.ts` — subdomain rewrite + password gate
- `prisma/schema.prisma` and migrations — DB schema
- `.env.example` — third-party API keys

## What's in this archive

| Path | Original location | Notes |
|---|---|---|
| `planning/scrapaholic_backlog.md` | `planning/` | Task-level backlog |
| `planning/ROADMAP.md` | `planning/` | 7-week MVP roadmap |
| `planning/CONTEXT.md` | `planning/` | Planning workspace guide |
| `docs/reddit-scraper-reference.md` | `docs/` | Apify Reddit Scraper reference |
| `docs/third-party-testing-research.md` | `docs/` | Cert program research |
| `docs/CONTEXT.md` | `docs/` | Docs workspace guide |
| `scripts/test-*.ts` | `scripts/` | Ad-hoc dev test scripts |
| `fixtures/extraction-results.json` | `fixtures/` | Extraction test fixture |

## Resuming the project

If work picks back up, move files back to their original top-level paths and
restore the relevant sections of `CLAUDE.md` and `README.md`. The 5.1e/5.1f/5.2
items in the backlog are the most recent completed work; 5.1g, 5.1h, 5.3 onward
are the next items.
