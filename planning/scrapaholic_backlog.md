# Scrapaholic — Clinical Product Verification Engine Backlog

**Page:** `/scrapaholic` (standalone page on lucs-web)
**Source:** ROADMAP.md (April 2026, 7-Week MVP Sprint)

---

## Milestone 1 — Project Setup & Infrastructure (Week 1–2)

- [x] **1.1** Set up route group and page scaffold for `/scrapaholic` within lucs-web
- [x] **1.2** Configure environment variables: `.env.example` with `FIRECRAWL_API_KEY`, `GEMINI_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_SECRET`, `DATABASE_URL`, `FDA_API_KEY`, `NCBI_API_KEY`; add `.env` to `.gitignore`
  - **Note:** Using Gemini 2.5 Flash (free tier) instead of Claude API for LLM calls during MVP
  - **Verify:** `.env.example` exists; `.env` in `.gitignore`; no raw keys in tracked files
- [x] **1.3** Set up PostgreSQL database (local Docker + free Supabase/Neon staging). Initial Prisma migration: `products` table (`id`, `url`, `name`, `brand`, `category`, `raw_claims` JSON, `created_at`)
  - **Verify:** `npx prisma db push` succeeds; table visible in DB GUI; insert + query a test row
- [x] **1.4** Configure private subdomain (`scrapaholic.lucttang.dev`) with DNS to Vercel. Add simple auth so only you can access
  - **Verify:** Visit subdomain — see app. Incognito without auth — access denied
- [x] **1.5** Set up GitHub Actions CI: lint (ESLint), type check (`tsc --noEmit`), deploy to staging on push to `main`
  - **Verify:** Push a type error — CI fails. Fix + push — CI passes, site updates within 5 min
- [ ] **1.6** Create API route stubs: `POST /api/analyze` (accepts `{ urls: string[] }`, returns 200 empty JSON), `GET /api/products` (returns empty array from DB). Validate with Zod
  - **Verify:** `curl` POST valid payload -> 200; POST missing `urls` -> 400 with validation error

---

## Milestone 2 — Firecrawl Product Extraction (Week 2–3)

- [ ] **2.1** Sign up for Firecrawl, store API key in `.env`. Install `@mendable/firecrawl-js`. Write test script scraping `https://example.com`
  - **Verify:** Script logs scraped markdown content, no auth errors
- [ ] **2.2** Define `ProductExtraction` TypeScript interface: `name`, `brand`, `price?`, `ingredients[]` (name, amount?, unit?), `claims[]`, `certifications[]`, `imageUrl?`. Add Zod schema
  - **Verify:** Interface compiles; mock object passes Zod validation
- [ ] **2.3** Write `extractProduct(url)` using Firecrawl `/scrape` with LLM extraction mode, prompt returns `ProductExtraction` schema
  - **Verify:** Call with real supplement URL — name, brand, and 3+ ingredients populated
- [ ] **2.4** Add error handling: try/catch Firecrawl calls. Handle 429 (exponential backoff, max 3 retries), network errors, malformed responses. Log failures with URL
  - **Verify:** Invalid key triggers 3 retries in logs, then clean error (no crash)
- [ ] **2.5** Write integration tests: 5 real supplement URLs from different brands. Assert non-empty name, brand, 1+ ingredient. Save results to JSON fixture
  - **Verify:** All 5 pass; fixture file valid; no obviously wrong extractions
- [ ] **2.6** Wire `extractProduct()` into `POST /api/analyze`. Accept URL array, extract sequentially, store in `products` table, return JSON
  - **Verify:** POST with 2 URLs -> 2 product objects with ingredients; 2 DB rows inserted

---

## Milestone 3 — Reddit Sentiment Pipeline (Week 3–4)

- [ ] **3.1** Register Reddit 'script' app. Store `client_id`/`client_secret` in `.env`. Write `getRedditAccessToken()` with 1hr caching
  - **Verify:** Returns valid bearer token; second call within 1hr uses cache
- [ ] **3.2** Write `searchReddit(query, subreddits?)` calling `/search.json`. Target `r/Supplements`, `r/Nootropics`, `r/SkincareAddiction`. Return top 10 posts (title, selftext, score, num_comments, permalink)
  - **Verify:** 'Thorne Magnesium Bisglycinate' returns 3+ posts; permalinks resolve
- [ ] **3.3** For each post, fetch top 5 comments via `/comments/{article}.json`. Concatenate post + comments into text blob per thread, cap 2000 chars
  - **Verify:** Known active thread includes comments; text <= 2000 chars
- [ ] **3.4** Define `SentimentResult` interface: `overallScore` (1-10), `totalMentions`, `themes` (positive/negative/neutral), `representativeQuotes[]`, `confidenceLevel`. Add Zod schema
  - **Verify:** Interface compiles; mock passes Zod validation
- [ ] **3.5** Write `analyzeRedditSentiment(productName, threadTexts[])` sending text to Gemini API with system prompt. Distinguish efficacy reports from hype
  - **Verify:** Real data -> score 1-10, 2+ themes, non-null confidence
- [ ] **3.6** Add `redditSentiment` JSON column to `products`. Wire sentiment into `POST /api/analyze` after extraction. Store in DB
  - **Verify:** POST response includes extraction + sentiment; DB row has both columns

---

## Milestone 4 — Verification & Trust Scoring (Week 4–5)

- [ ] **4.1** Research and document free APIs: FDA Adverse Event (`api.fda.gov`), NIH DSLD (`dsld.od.nih.gov`), ClinicalTrials.gov, PubMed E-utilities. Write markdown with base URLs, auth, rate limits, endpoints
  - **Verify:** Markdown file exists with 3+ APIs; each has working example `curl`
- [ ] **4.2** Write `checkFDAAdverseEvents(productName, brand)` querying openFDA for adverse events. Return total reports, top 5 reactions, serious event flag
  - **Verify:** Known brand returns data; gibberish name returns zero (no error)
- [ ] **4.3** Write `checkIngredientEvidence(ingredientName, claimedBenefit)` searching PubMed E-utilities. Return study count, RCT flag, LLM-generated evidence summary
  - **Verify:** ('magnesium glycinate', 'sleep') -> count > 0 + coherent summary; ('pixie dust', 'flying') -> 0 studies
- [ ] **4.4** Define `TrustScore` interface: `overall` (0-100), `breakdown` (claimVerification, ingredientEvidence, userSentiment, safetyProfile), `flags[]`, `explanation`. Add Zod schema
  - **Verify:** Compiles; good product (85+) and sketchy product (30-) both pass validation
- [ ] **4.5** Write `calculateTrustScore(extraction, sentiment, fdaData, evidenceData)` sending all data to Gemini with scoring rubric: ingredient evidence 35%, user sentiment 25%, claim verification 25%, safety 15%
  - **Verify:** Real data -> score 0-100; breakdown roughly sums to overall; 1+ flag; coherent explanation
- [ ] **4.6** Wire trust scoring into `POST /api/analyze` as final step. Store in `trust_score` JSON column. Return full analysis
  - **Verify:** POST with 2 URLs -> all 3 data layers per product; DB rows complete; response < 60s

---

## Milestone 5 — Comparison UI & User Feedback Loop (Week 5–7)

- [ ] **5.1** Build URL input component: form for 2-4 product URLs, validation (http/https), loading state with progress. React + Tailwind
  - **Verify:** 2 valid URLs -> spinner; invalid string -> inline error; blocks 0 or >4 URLs
- [ ] **5.2** Build `ProductCard` component: name, brand, trust score (colored gauge: green >70, yellow 40-70, red <40), top 3 ingredients, claims, Reddit mention count
  - **Verify:** Mock data renders all fields; gauge color matches thresholds; responsive at 375px and 1200px
- [ ] **5.3** Build `ComparisonView`: 2-4 `ProductCard`s side by side. Highlight ingredient differences with colored badges. Show trust flags beneath each card
  - **Verify:** 2 products side by side on desktop, stacked on mobile; differences highlighted; flags visible
- [ ] **5.4** Add 'Choose This Product' button. POST to `/api/selections` with `{ chosenProductId, comparisonProductIds[], sessionId }`. Store in `selections` table
  - **Verify:** Click -> POST 200; DB row with correct IDs; button shows confirmation
- [ ] **5.5** Build `GET /api/recommendations` endpoint: top 5 products by selection count per category. Include trust scores. Fall back to trust score ranking if <10 selections
  - **Verify:** 15 mock selections favoring X -> X is #1; <10 selections -> sorted by trust score
- [ ] **5.6** Add 'Popular Verified Alternatives' section below comparison. Call recommendations endpoint, display up to 3 mini-cards (name, brand, trust score, selection count)
  - **Verify:** Alternatives appear with up to 3 products; empty state shows 'Be the first to compare!'
- [ ] **5.7** End-to-end test: paste 2 real URLs on staging, wait for analysis, review comparison, select winner. Refresh + new comparison in same category -> winner appears in recommendations
  - **Verify:** Full flow no errors; no console exceptions; selected product in recommendations; load-to-result < 90s

---

## Post-MVP (Backlog — Unprioritized)

- [ ] **P.1** Vertical expansion: skincare, health devices, wellness (new extraction schemas + subreddit mappings)
- [ ] **P.2** Redis caching layer: 7-day cache for Firecrawl + Reddit data (~60s -> ~5s for repeats)
- [ ] **P.3** User accounts: NextAuth/Clerk for saved comparisons, tracking, trust score change alerts
- [ ] **P.4** Browser extension: Chrome overlay for trust scores on Amazon, iHerb, brand sites
- [ ] **P.5** API monetization: paid trust scoring API for review sites, health coaches, e-commerce
- [ ] **P.6** Community reviews: authenticated user efficacy reports as first-party data layer
