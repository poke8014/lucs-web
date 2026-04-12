# Source Workspace

All application code lives here.

## Layout

```
src {
  middleware.ts, generated/prisma,
  lib { prisma.ts, firecrawl.ts, schemas { product-extraction.ts } },
  app {
    layout.tsx, globals.css,
    (personal) {},
    (massage) { layout.tsx, page.tsx },
    scrapaholic { layout.tsx, page.tsx, login/page.tsx },
    api { analyze/route.ts, products/route.ts, scrapaholic-auth/route.ts }
  }
}
```

## Key Patterns

- **Auth**: Simple password-based via `SCRAPAHOLIC_PASSWORD` env var. Middleware checks a SHA-256 hashed cookie
- **Database**: PostgreSQL via Prisma with `@prisma/adapter-pg`. Schema in `/prisma/schema.prisma`
- **Extraction**: Firecrawl LLM extraction mode with exponential backoff (max 3 retries) for 429/5xx
- **Validation**: Zod schemas for all API inputs and extraction outputs
- **Route groups**: `(personal)` and `(massage)` share root layout. `scrapaholic` is standalone at `/scrapaholic`
- **Subdomain**: `scrapaholic.lucttang.dev` rewrites to `/scrapaholic/*` via middleware. `/scrapaholic` is blocked on the main domain

## Scripts

Available in `package.json`:
- `npm run dev` — local dev server
- `npm run build` — `prisma generate && next build`
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
