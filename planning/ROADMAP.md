# Product Roadmap — Clinical Product Verification Engine

**Version 1.0 • April 2026 • 7-Week MVP Sprint**

From MVP to Scalable Research & Comparison Platform

---

## Executive Overview

This roadmap defines the milestones and actionable tasks required to build a clinical product verification engine. The tool allows users to paste product URLs and receive a trust-scored comparison powered by Firecrawl web extraction, Reddit sentiment analysis, and third-party verification data from FDA, NIH, and PubMed databases.

Each milestone is designed to be completed sequentially by a junior engineer, with every task including a concrete verification method so progress is objectively measurable. The system starts specific (supplements vertical) and is architected to generalize across product categories as the user-driven database grows.

---

## System Architecture

The system follows a three-pipeline architecture that converges into a trust scoring engine:

| Pipeline | Data Source | Output |
|---|---|---|
| Claims Extraction | Firecrawl LLM scrape of product URLs | Structured ingredient list, dosages, certifications, marketing claims |
| User Sentiment | Apify Reddit Scraper + Gemini analysis | Efficacy themes, representative quotes, confidence-weighted sentiment score |
| Verification | FDA, NIH DSLD, PubMed, ClinicalTrials.gov | Adverse event counts, clinical evidence strength, certification cross-checks |

---

## Technology Stack

- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend:** Next.js API routes (Node.js)
- **Database:** PostgreSQL via Prisma ORM
- **Web Scraping:** Firecrawl SDK (LLM extraction mode)
- **Sentiment:** Apify Reddit Scraper Pro + Gemini 2.5 Flash for NLP analysis (both free tier during MVP)
- **Verification:** OpenFDA API, PubMed E-utilities, NIH DSLD
- **Hosting:** Vercel / Railway with private subdomain
- **CI/CD:** GitHub Actions

---

## MVP Cost Estimate (Monthly)

| Service | Tier | Cost |
|---|---|---|
| Firecrawl | Free (500 credits/mo) | $0 |
| Apify (Reddit Scraper) | Free ($5/mo compute) | $0 |
| Gemini 2.5 Flash | Free tier | $0 |
| PostgreSQL (Supabase/Neon) | Free tier | $0 |
| Hosting (Vercel) | Hobby | $0–20 |
| Domain/DNS | Existing domain | $0 |
| **Total Estimated** | | **$0–20/month** |

---

## Milestones & Task Breakdown

Each milestone below contains tasks designed for a junior engineer. Every task has a verification method (how to confirm it's done correctly) and a time estimate. Tasks should be completed in order within each milestone.

---

### Milestone 1 — Project Setup & Infrastructure

**Timeline:** Week 1–2
**Goal:** Establish the development environment, repository structure, and deployment pipeline so all future work has a stable foundation.
**Deliverable:** A deployed skeleton app accessible via a private subdomain on your existing domain, with CI/CD pushing changes automatically.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Initialize a monorepo (e.g., Turborepo or Nx) with `/apps/web` (Next.js frontend) and `/packages/shared` (shared types/utils). Commit to GitHub. | Run `npm run build` from root — both packages compile with zero errors. | 2 hrs |
| 2 | Configure environment variables: create `.env.example` with `FIRECRAWL_API_KEY`, `GEMINI_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_SECRET`, `DATABASE_URL`, `FDA_API_KEY`, `NCBI_API_KEY`. Add `.env` to `.gitignore`. Note: Using Gemini 2.5 Flash (free tier) instead of Claude API for LLM calls during MVP. | `.env.example` exists in repo; `.env` is in `.gitignore`; no raw keys in tracked files. | 30 min |
| 3 | Set up a PostgreSQL database (local Docker container + a free Supabase or Neon instance for staging). Run an initial migration with Prisma or Drizzle that creates a `products` table with columns: `id`, `url`, `name`, `brand`, `category`, `raw_claims` (JSON), `created_at`. | Run `npx prisma db push` or equivalent — table appears in DB GUI. Insert a test row and query it back. | 2 hrs |
| 4 | Create a private subdomain (e.g., `verify.yourdomain.com`) with DNS pointing to your hosting provider (Vercel, Railway, etc.). Configure authentication via a simple shared secret or Cloudflare Access so only you can reach it. | Visit `verify.yourdomain.com` from your browser — see the Next.js default page. Visit from an incognito window without auth — access denied. | 2 hrs |
| 5 | Set up GitHub Actions CI: on every push to `main`, run linting (ESLint), type checking (`tsc --noEmit`), and deploy to the staging subdomain. | Push a commit with a type error — CI fails. Fix it and push — CI passes and site updates within 5 minutes. | 2 hrs |
| 6 | Create API route stubs: `POST /api/analyze` (accepts `{ urls: string[] }`, returns 200 with empty JSON), `GET /api/products` (returns empty array from DB). Add request validation with Zod. | `curl` POST with valid payload → 200. `curl` POST with missing `urls` field → 400 with validation error message. | 1.5 hrs |

---

### Milestone 2 — Firecrawl Product Extraction

**Timeline:** Week 2–3
**Goal:** Given a product URL, extract structured product data (name, brand, ingredients, claims, price) using Firecrawl's scrape endpoint with LLM extraction.
**Deliverable:** A tested extraction service that takes any supplement product URL and returns normalized JSON with product claims and ingredient data.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Sign up for Firecrawl, get API key, and store it in `.env`. Install the Firecrawl JS/TS SDK (`@mendable/firecrawl-js`). Write a simple test script that scrapes `https://example.com` and logs the result. | Run the test script — console output shows scraped markdown content from example.com with no auth errors. | 1 hr |
| 2 | Define a TypeScript interface `ProductExtraction`: `{ name: string, brand: string, price?: string, ingredients: { name: string, amount?: string, unit?: string }[], claims: string[], certifications: string[], imageUrl?: string }`. | Interface compiles. Create a mock object conforming to it and pass it through a Zod schema validator — passes. | 45 min |
| 3 | Write an `extractProduct(url: string)` function that calls Firecrawl's `/scrape` endpoint with LLM extraction mode, passing a prompt that instructs the LLM to return data matching the `ProductExtraction` schema. Use the 'extract' format option. | Call `extractProduct()` with a real supplement URL (e.g., a product from Thorne or Garden of Life). Log output. Confirm name, brand, and at least 3 ingredients are populated. | 3 hrs |
| 4 | Add error handling: wrap the Firecrawl call in try/catch. Handle rate limits (429 → retry with exponential backoff, max 3 retries), network errors, and malformed responses. Log all failures to console with the URL that failed. | Simulate a 429 by calling with an invalid key — see 3 retry attempts in logs, then a clean error message (not an unhandled crash). | 1.5 hrs |
| 5 | Write integration tests: create a test file with 5 real supplement URLs from different brands. Run `extractProduct()` on each. Assert that every result has a non-empty name, brand, and at least 1 ingredient. Save results to a JSON fixture file. | All 5 tests pass. Fixture file exists with valid data. Review manually — no obviously wrong extractions (e.g., brand name in ingredient list). | 2 hrs |
| 6 | Wire `extractProduct()` into the `POST /api/analyze` route. Accept an array of URLs, run extraction on each (sequentially for now), store results in the `products` table, and return the extracted data as JSON. | `curl` POST `/api/analyze` with 2 URLs → response contains 2 product objects with ingredients. Check DB — 2 rows inserted. | 2 hrs |

---

### Milestone 3 — Reddit Sentiment Pipeline via Apify

**Timeline:** Week 3–4
**Goal:** For a given product or brand, find relevant Reddit discussions and extract user sentiment and efficacy signals using an LLM.
**Deliverable:** A sentiment service that returns a structured summary of what real users say about a product, including positive/negative themes and an overall confidence score.

> **Pivot (2026-04-12):** Reddit API access requires approval via their Responsible Builder Policy, which is not being granted. Replaced direct Reddit API integration with [Apify FREE Reddit Scraper Pro](https://apify.com/spry_wholemeal/reddit-scraper) (actor `RGEBfXu0TSc1siPLb`), which scrapes Reddit via public JSON endpoints. This simplifies the pipeline from 6 tasks to 5 by combining search + comment fetching into a single actor call.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Add `APIFY_API_TOKEN` to `.env.example` and `.env`. Remove obsolete `REDDIT_CLIENT_ID`/`REDDIT_SECRET`. | `.env.example` has `APIFY_API_TOKEN`; no Reddit vars; app boots. | 10 min |
| 2 | Create `src/lib/apify-reddit.ts` with `scrapeRedditPosts(productName)`. Call Apify actor via REST API (no SDK). Zod schemas for post+comment output. Retry logic (3 attempts, exponential backoff). Target r/Supplements, r/Nootropics, r/SkincareAddiction. | Call with 'Thorne Magnesium Bisglycinate' → 1+ posts with titles; comments present on high-engagement posts; invalid token → 3 retries then clean error. | 2 hrs |
| 3 | Confirm existing `SentimentResult` schema at `src/lib/schemas/sentiment-result.ts` covers the Apify data flow. | Import and validate a mock `SentimentResult`; Zod `.parse()` succeeds. | 10 min |
| 4 | Install `@google/generative-ai`. Create `src/lib/gemini.ts` (shared client) and `src/lib/sentiment.ts` with `analyzeRedditSentiment(productName, posts)`. Send Apify post+comment data to Gemini. Distinguish efficacy reports from hype. | Real Apify data → valid `SentimentResult`; score 1–10; 2+ themes; quotes have reddit.com sources. | 2 hrs |
| 5 | Add `redditSentiment Json?` column to `products`. Wire sentiment into `POST /api/analyze` after extraction. Sentiment failure stores `null` (does not fail request). | POST response includes extraction + sentiment; DB row has both columns; Apify down → extraction succeeds with `redditSentiment: null`. | 1 hr |

---

### Milestone 4 — Product Analysis UI

**Timeline:** Week 4
**Goal:** First user-facing interface. A single-product analysis view that surfaces everything from Milestones 2–3 (extraction + sentiment) in the browser.
**Deliverable:** A working `/scrapaholic` page where a user pastes one product URL, waits for analysis, and sees structured extraction data alongside Reddit sentiment.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Build `UrlInput` component: single URL text field, validation (http/https), submit button, loading state with animated progress steps ("Scraping product page…", "Searching Reddit…", "Analyzing sentiment…"). React + Tailwind. | Valid URL → spinner with progress text. Invalid string → inline error. Empty submit blocked. | 2 hrs |
| 2 | Build `ProductCard` component: product name, brand, price (if available), ingredients list with amounts/units, marketing claims as badges, certifications. | Mock extraction data renders all fields. Missing optional fields (price, imageUrl) degrade gracefully. Responsive at 375px and 1200px. | 3 hrs |
| 3 | Build `SentimentPanel` component: score gauge (1–10, colored: green ≥7, yellow 4–6, red ≤3), confidence badge (low/medium/high), themes list with sentiment icons, representative quotes with clickable Reddit links. | Mock sentiment data renders. Gauge color matches thresholds. Quotes link to reddit.com. "Low confidence" shows muted styling. | 3 hrs |
| 4 | Wire into `/scrapaholic` page: submit URL → call `POST /api/analyze` → render `ProductCard` + `SentimentPanel`. Handle API errors with user-friendly message. Show empty state before first analysis. | Paste a real supplement URL on staging → see extraction + sentiment. Apify down → extraction renders, sentiment shows "unavailable". Network error → error toast, no crash. | 2 hrs |

---

### Milestone 5 — Verification & Trust Scoring

**Timeline:** Week 4–5
**Goal:** Cross-reference product claims against third-party databases, generate a composite trust score, and surface verification data in the existing product analysis UI.
**Deliverable:** A trust scoring engine with a transparent, explainable score — plus UI components for trust gauge, FDA data, and ingredient evidence integrated into the analysis page.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Research and document available free APIs: FDA Adverse Event API (`api.fda.gov`), NIH Dietary Supplement Label Database (`dsld.od.nih.gov`), ClinicalTrials.gov API, PubMed E-utilities. Write a markdown file listing each API's base URL, auth requirements, rate limits, and relevant endpoints. | Markdown file exists with at least 3 APIs documented. Each entry has a working example `curl` command that returns data. | 2 hrs |
| 2 | Write `checkFDAAdverseEvents(productName, brand)` that queries the openFDA API for adverse event reports matching the product. Return: total reports, most common adverse reactions (top 5), and whether any serious events were reported. | Call with a known supplement brand — returns structured data. Call with a gibberish name — returns zero results (not an error). | 2 hrs |
| 3 | Write `checkIngredientEvidence(ingredientName, claimedBenefit)` that searches PubMed's free E-utilities API for clinical studies. Return: number of studies found, whether any are RCTs (randomized controlled trials), and a brief LLM-generated summary of the evidence strength. | Call with ('magnesium glycinate', 'sleep') — returns study count > 0 and a coherent summary. Call with ('pixie dust', 'flying') — returns 0 studies. | 3 hrs |
| 4 | Define a `TrustScore` interface: `{ overall: number (0–100), breakdown: { claimVerification, ingredientEvidence, userSentiment, safetyProfile }, flags: { type, message }[], explanation }`. Add Zod schema. | Interface compiles. Mock scores for a good product (85+) and a sketchy product (30–) — both pass validation. | 30 min |
| 5 | Write `calculateTrustScore(extraction, sentiment, fdaData, evidenceData)` sending all data to Gemini with scoring rubric: ingredient evidence 35%, user sentiment 25%, claim verification 25%, safety 15%. | Call with real data. Score 0–100. Breakdown sums roughly to overall. 1+ flag. Coherent explanation. | 3 hrs |
| 6 | Wire trust scoring into `POST /api/analyze` as final pipeline step. Store in `trust_score` JSON column. Return complete analysis. | `curl` with 2 product URLs → all 3 data layers per product. DB rows complete. Response < 60s. | 2 hrs |
| 7 | Build `TrustScoreGauge` component: circular/semicircular gauge (green >70, yellow 40–70, red <40), breakdown bars for each sub-score, flags list with warning/positive/info icons. | Score 85 → green gauge. Score 35 → red gauge. Breakdown bars proportional. Flags render with correct icons. | 3 hrs |
| 8 | Build `VerificationDetails` component: FDA adverse events summary (total reports, top reactions, serious event badge), ingredient evidence cards (study count, RCT badge, evidence summary per ingredient). | Mock FDA + evidence data renders all sections. Zero adverse events → "No reports found". No studies → "No clinical data". | 3 hrs |
| 9 | Integrate trust score + verification into product analysis page: `TrustScoreGauge` and `VerificationDetails` render below `ProductCard` + `SentimentPanel`. Graceful degradation if verification APIs fail. | Full pipeline: paste URL → extraction, sentiment, trust score, FDA data, evidence all visible. FDA API down → trust score still renders with reduced confidence note. | 2 hrs |

---

### Milestone 6 — Comparison View & Recommendations

**Timeline:** Week 5–7
**Goal:** Extend the single-product view into a multi-product comparison experience with user selections and community-driven recommendations.
**Deliverable:** A polished side-by-side comparison view with trust scores, ingredient difference highlighting, and a 'pick your winner' mechanism that feeds future recommendations.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Extend `UrlInput` to accept 2–4 product URLs. Dynamic add/remove fields, validation per field, shared loading state with per-product progress. | 2 valid URLs → spinner. Invalid string → inline error on that field. Blocks 0 or >4 URLs. Can add/remove URL fields. | 2 hrs |
| 2 | Build `ComparisonView`: 2–4 `ProductCard`s side by side (stacked on mobile). Highlight ingredient differences with colored badges (green = unique advantage, red = missing). Trust score flags beneath each card. | 2 products side by side on desktop, stacked on mobile. Differences highlighted. Flags visible. | 4 hrs |
| 3 | Add 'Choose This Product' button on each card. POST to `/api/selections` with `{ chosenProductId, comparisonProductIds[], sessionId }`. Store in `selections` table. | Click → POST 200. DB row with correct IDs. Button shows confirmation state. | 2 hrs |
| 4 | Build `GET /api/recommendations` endpoint: top 5 products by selection count per category. Include trust scores. Fall back to trust score ranking if <10 selections. | 15 mock selections favoring X → X is #1. <10 selections → sorted by trust score. | 2 hrs |
| 5 | Add 'Popular Verified Alternatives' section below comparison. Call recommendations endpoint, display up to 3 mini-cards (name, brand, trust score, selection count). | Alternatives appear with up to 3 products. Empty state shows 'Be the first to compare!' | 2 hrs |
| 6 | End-to-end test: paste 2 real URLs on staging, wait for analysis, review comparison, select winner. Refresh + new comparison in same category → winner appears in recommendations. | Full flow no errors. No console exceptions. Selected product in recommendations. Load-to-result < 90s. | 3 hrs |

---

## Post-MVP: Growth Roadmap

Once the MVP is stable and generating data, the following tracks can be pursued in parallel based on what the usage data reveals:

**Vertical Expansion:** Replicate the extraction pipeline for skincare, health devices, and wellness products. Each vertical requires a new extraction schema and subreddit mapping, but the scoring engine and UI are reusable.

**Caching Layer:** Introduce Redis caching for Firecrawl results and Reddit data. Products analyzed in the last 7 days skip re-extraction, dropping response time from ~60s to ~5s for repeat queries.

**User Accounts:** Add authentication (NextAuth or Clerk) so users can save comparisons, track products over time, and receive alerts when a product's trust score changes.

**Browser Extension:** A lightweight Chrome extension that overlays trust scores on Amazon, iHerb, and brand websites as users browse — the highest-leverage distribution channel.

**API Monetization:** Expose the trust scoring engine as a paid API for supplement review sites, health coaches, and e-commerce platforms that want to embed verification data.

**Community Reviews:** Let authenticated users submit their own efficacy reports, creating a first-party review layer that supplements Reddit data and reduces dependency on external APIs.
