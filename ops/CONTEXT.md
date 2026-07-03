# Ops Workspace

Deployment and operations configuration. Agent-facing invariants and decision rationale live in [HANDOFF.md](HANDOFF.md).

## Infrastructure

- **Hosting**: Vercel (auto-deploy from `main` branch)
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) — lint + typecheck on push/PR to main
- **Database**: Supabase (Postgres) planned for Sunshower — not yet wired up. Schema sketched in [../planning/sunshower/tech-stack.md](../planning/sunshower/tech-stack.md#database-architecture).
- **Env vars**: see `.env.example` at project root

## Data Build

[build-plant-data.mjs](build-plant-data.mjs) reads `vault/plants/*.md` frontmatter plus iNaturalist photo metadata (`vault/raw/assets/inaturalist/<slug>/metadata.json`) and emits `src/data/plants.json` for the app to consume at build time.

- Run `node ops/build-plant-data.mjs` after any change to plant-page frontmatter, and commit the regenerated JSON.
- `src/data/plants.json` is derived output — never hand-edit it.

## Branching Strategy

Every task gets its own feature branch off `main`. No direct commits to `main`.

1. Branch from `main` for any change (feature, fix, doc, refactor).
2. Run the pre-deploy checks below locally before opening a PR / merging.
3. Merge to `main` only after the branch is tested and the checks pass.

`main` is what Vercel auto-deploys, so it should always be in a shippable state.

## Pre-Deploy Workflow

Before pushing to `main`, run checks locally to catch issues early:

1. `npm run lint` — ESLint
2. `npm run typecheck` — `tsc --noEmit`
3. `npm run build` — full production build

If all three pass locally, push. Vercel auto-deploys from `main`; GitHub Actions runs CI in parallel.

## Monitoring a Deploy

After pushing, check the CI pipeline:

1. Run `gh run list --limit 5` to find the latest workflow run.
2. Run `gh run watch <run-id>` to stream CI status until it completes.
3. If CI passes, verify the live site at the Vercel deployment URL.

## Debugging a Failed Deploy

1. Run `gh run view <run-id> --log-failed` to see only the failed step output.
2. Identify which step failed (lint or typecheck) and fix locally.
3. Do not push again until the fix passes the same local pre-deploy checks above.
