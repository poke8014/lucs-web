# Ops Workspace

Deployment and operations configuration.

## Infrastructure

- **Hosting**: Vercel (auto-deploy from `main` branch)
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) — lint + typecheck on push/PR to main
- **Database**: PostgreSQL (local Docker for dev, Supabase/Neon for staging)
- **DNS**: `scrapaholic.lucttang.dev` subdomain pointed to Vercel
- **Env vars**: see `.env.example` at project root

## Pre-Deploy Workflow

Before pushing to `main`, run checks locally to catch issues early:

1. `npm run lint` — ESLint
2. `npm run typecheck` — `tsc --noEmit`
3. `npm run build` — full production build (includes `prisma generate`)

If all three pass locally, push. Vercel auto-deploys from `main`; GitHub Actions runs CI in parallel.

## Monitoring a Deploy

After pushing, check the CI pipeline:

1. Run `gh run list --limit 5` to find the latest workflow run.
2. Run `gh run watch <run-id>` to stream CI status until it completes.
3. If CI passes, verify the live site at the Vercel deployment URL.

## Debugging a Failed Deploy

1. Run `gh run view <run-id> --log-failed` to see only the failed step output.
2. Identify which step failed (lint, typecheck, or prisma generate) and fix locally.
3. Do not push again until the fix passes the same local pre-deploy checks above.
