# Luc's Web

Personal brand website.

## Sites

| Site | Route | Domain | Description |
|------|-------|--------|-------------|
| Massage | `/` | lucttang.dev | Tang Therapeutics — massage services, availability, Calendly booking |
| Personal | — | lucttang.dev | Portfolio for software employers (coming soon) |

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL + Prisma 7
- **Hosting**: Vercel
- **CI**: GitHub Actions (lint + typecheck)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in API keys (see .env.example for descriptions)

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the massage site.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |

## Project Structure

See [CLAUDE.md](CLAUDE.md) for the full folder structure and workspace guide.
