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
| User Sentiment | Reddit API + Gemini analysis | Efficacy themes, representative quotes, confidence-weighted sentiment score |
| Verification | FDA, NIH DSLD, PubMed, ClinicalTrials.gov | Adverse event counts, clinical evidence strength, certification cross-checks |

---

## Technology Stack

- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend:** Next.js API routes (Node.js)
- **Database:** PostgreSQL via Prisma ORM
- **Web Scraping:** Firecrawl SDK (LLM extraction mode)
- **Sentiment:** Reddit API + Gemini 2.5 Flash for NLP analysis (free tier during MVP)
- **Verification:** OpenFDA API, PubMed E-utilities, NIH DSLD
- **Hosting:** Vercel / Railway with private subdomain
- **CI/CD:** GitHub Actions

---

## MVP Cost Estimate (Monthly)

| Service | Tier | Cost |
|---|---|---|
| Firecrawl | Free (500 credits/mo) | $0 |
| Reddit API | Free (100 req/min) | $0 |
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

### Milestone 3 — Reddit Sentiment Pipeline

**Timeline:** Week 3–4
**Goal:** For a given product or brand, find relevant Reddit discussions and extract user sentiment and efficacy signals using an LLM.
**Deliverable:** A sentiment service that returns a structured summary of what real users say about a product, including positive/negative themes and an overall confidence score.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Register a Reddit 'script' app at `reddit.com/prefs/apps`. Store `client_id` and `client_secret` in `.env`. Write a helper function `getRedditAccessToken()` that POSTs to `https://www.reddit.com/api/v1/access_token` with `grant_type=client_credentials`. Cache the token for 1 hour. | Call `getRedditAccessToken()` — returns a valid bearer token string. Call it again within 1 hr — returns cached token (no network request in logs). | 1.5 hrs |
| 2 | Write `searchReddit(query: string, subreddits?: string[])` that calls Reddit's `/search.json` endpoint with the product name. Limit to relevant subreddits (`r/Supplements`, `r/Nootropics`, `r/SkincareAddiction`). Return the top 10 posts sorted by relevance, including `title`, `selftext`, `score`, `num_comments`, and `permalink`. | Call with 'Thorne Magnesium Bisglycinate' — returns at least 3 posts with non-empty titles. All permalinks resolve to valid Reddit URLs. | 2 hrs |
| 3 | For each post returned, fetch the top 5 comments (sorted by 'best') using Reddit's `/comments/{article}.json` endpoint. Concatenate post body + comment bodies into a single text blob per thread. Cap at 2000 characters per thread. | For a known active thread, confirm comments are included in output. Total text per thread ≤ 2000 chars. | 2 hrs |
| 4 | Define a `SentimentResult` interface: `{ overallScore: number (1–10), totalMentions: number, themes: { positive: string[], negative: string[], neutral: string[] }, representativeQuotes: { text: string, context: string, sentiment: string }[], confidenceLevel: 'low' | 'medium' | 'high' }`. | Interface compiles. Mock object passes Zod validation. | 30 min |
| 5 | Write `analyzeRedditSentiment(productName, threadTexts[])` that sends the concatenated Reddit text to the Gemini API with a system prompt instructing it to return a JSON `SentimentResult`. The prompt should distinguish efficacy reports ('this actually helped my sleep') from hype ('just ordered, excited!'). | Call with real thread data for a popular supplement. Output has `overallScore` between 1–10, at least 2 themes in positive or negative, and `confidenceLevel` is not null. | 3 hrs |
| 6 | Add a `redditSentiment` field (JSON) to the `products` table. Wire the sentiment pipeline into `POST /api/analyze` so it runs after extraction. Store results in DB alongside product data. | `curl` POST `/api/analyze` → response now includes both product extraction and sentiment data. DB row has both columns populated. | 1.5 hrs |

---

### Milestone 4 — Verification & Trust Scoring

**Timeline:** Week 4–5
**Goal:** Cross-reference product claims against third-party databases and generate a composite trust score that quantifies how verified a product's claims really are.
**Deliverable:** A trust scoring engine that flags discrepancies between claims and evidence, producing a transparent, explainable score per product.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Research and document available free APIs: FDA Adverse Event API (`api.fda.gov`), NIH Dietary Supplement Label Database (`dsld.od.nih.gov`), ClinicalTrials.gov API. Write a markdown file listing each API's base URL, auth requirements, rate limits, and relevant endpoints. | Markdown file exists with at least 3 APIs documented. Each entry has a working example `curl` command that returns data. | 2 hrs |
| 2 | Write `checkFDAAdverseEvents(productName, brand)` that queries the openFDA API for adverse event reports matching the product. Return: total reports, most common adverse reactions (top 5), and whether any serious events were reported. | Call with a known supplement brand — returns structured data. Call with a gibberish name — returns zero results (not an error). | 2 hrs |
| 3 | Write `checkIngredientEvidence(ingredientName, claimedBenefit)` that searches PubMed's free E-utilities API for clinical studies. Return: number of studies found, whether any are RCTs (randomized controlled trials), and a brief LLM-generated summary of the evidence strength. | Call with ('magnesium glycinate', 'sleep') — returns study count > 0 and a coherent summary. Call with ('pixie dust', 'flying') — returns 0 studies. | 3 hrs |
| 4 | Define a `TrustScore` interface: `{ overall: number (0–100), breakdown: { claimVerification: number, ingredientEvidence: number, userSentiment: number, safetyProfile: number }, flags: { type: 'warning' | 'positive' | 'info', message: string }[], explanation: string }`. | Interface compiles. Create mock scores for a good product (85+) and a sketchy product (30–) — both pass validation. | 30 min |
| 5 | Write `calculateTrustScore(extraction, sentiment, fdaData, evidenceData)` that sends all collected data to the Gemini API with a detailed scoring rubric prompt. The rubric should weight: ingredient evidence (35%), user sentiment (25%), claim verification (25%), safety profile (15%). Return a `TrustScore`. | Call with real data from previous milestones. Score is between 0–100. Breakdown sums roughly to overall. At least 1 flag is present. Explanation is a coherent paragraph. | 3 hrs |
| 6 | Wire the trust scoring into `POST /api/analyze` as the final pipeline step. Store the `TrustScore` in a new `trust_score` JSON column. Return the complete analysis (extraction + sentiment + trust score) in the API response. | Full pipeline test: `curl` with 2 product URLs → response has all three data layers per product. DB rows have all columns filled. Total response time < 60 seconds. | 2 hrs |

---

### Milestone 5 — Comparison UI & User Feedback Loop

**Timeline:** Week 5–7
**Goal:** Build the user-facing comparison interface and implement the selection tracking that grows your product database over time.
**Deliverable:** A polished side-by-side comparison view with trust scores, ingredient breakdowns, and a 'pick your winner' mechanism that feeds future recommendations.

| # | Task | Verification | Est. Time |
|---|---|---|---|
| 1 | Build a URL input component: a form where users can paste 2–4 product URLs, with basic validation (must be valid http/https URLs). Show a loading state with progress indicators while analysis runs. Use React + Tailwind. | Paste 2 valid URLs → loading spinner appears. Paste an invalid string → inline validation error. Form prevents submission with 0 or >4 URLs. | 3 hrs |
| 2 | Build a `ProductCard` component displaying: product name, brand, trust score (as a colored circular gauge: green > 70, yellow 40–70, red < 40), top 3 ingredients with amounts, key claims, and the number of Reddit mentions. | Render a `ProductCard` with mock data → all fields visible. Score gauge color matches thresholds. Component is responsive (looks good at 375px and 1200px widths). | 4 hrs |
| 3 | Build a `ComparisonView` that displays 2–4 `ProductCard`s side by side. Highlight differences: if Product A has an ingredient Product B lacks, show it with a colored badge. Show trust score flags beneath each card. | Render with 2 products → cards are side by side on desktop, stacked on mobile. Differences are visually highlighted. At least one flag is visible. | 4 hrs |
| 4 | Add a 'Choose This Product' button on each card. When clicked, POST to `/api/selections` with `{ chosenProductId, comparisonProductIds[], sessionId }`. Store in a `selections` table (`id`, `chosen_product_id`, `comparison_ids` JSON, `created_at`). | Click the button → POST succeeds (200). Check DB — selection row exists with correct product IDs. Button shows a confirmation state after click. | 2 hrs |
| 5 | Build a `GET /api/recommendations` endpoint: given a product category, return the top 5 products by selection count from the `selections` table. Include their trust scores. Fall back to trust score ranking if < 10 total selections exist. | Insert 15 mock selections favoring Product X. `GET /api/recommendations?category=supplements` → Product X is #1. Delete selections so < 10 remain → endpoint returns products sorted by trust score. | 2 hrs |
| 6 | Add a 'Popular Verified Alternatives' section below the comparison view. Call the recommendations endpoint and display up to 3 alternatives with mini-cards showing name, brand, trust score, and selection count. | After running a comparison, alternatives section appears with up to 3 products. Each mini-card links to a full analysis. If no alternatives exist, section shows a 'Be the first to compare!' message. | 2 hrs |
| 7 | End-to-end test: paste 2 real product URLs into the live staging site, wait for analysis, review the comparison, select a winner. Refresh the page and run another comparison in the same category — confirm the first winner appears in recommendations. | Full flow works without errors in staging. Console shows no unhandled exceptions. Selected product appears in recommendations on second comparison. Page load-to-result time < 90 seconds. | 3 hrs |

---

## Post-MVP: Growth Roadmap

Once the MVP is stable and generating data, the following tracks can be pursued in parallel based on what the usage data reveals:

**Vertical Expansion:** Replicate the extraction pipeline for skincare, health devices, and wellness products. Each vertical requires a new extraction schema and subreddit mapping, but the scoring engine and UI are reusable.

**Caching Layer:** Introduce Redis caching for Firecrawl results and Reddit data. Products analyzed in the last 7 days skip re-extraction, dropping response time from ~60s to ~5s for repeat queries.

**User Accounts:** Add authentication (NextAuth or Clerk) so users can save comparisons, track products over time, and receive alerts when a product's trust score changes.

**Browser Extension:** A lightweight Chrome extension that overlays trust scores on Amazon, iHerb, and brand websites as users browse — the highest-leverage distribution channel.

**API Monetization:** Expose the trust scoring engine as a paid API for supplement review sites, health coaches, and e-commerce platforms that want to embed verification data.

**Community Reviews:** Let authenticated users submit their own efficacy reports, creating a first-party review layer that supplements Reddit data and reduces dependency on external APIs.
