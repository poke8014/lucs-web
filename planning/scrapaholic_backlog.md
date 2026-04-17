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
- [x] **1.6** Create API route stubs: `POST /api/analyze` (accepts `{ urls: string[] }`, returns 200 empty JSON), `GET /api/products` (returns empty array from DB). Validate with Zod
  - **Verify:** `curl` POST valid payload -> 200; POST missing `urls` -> 400 with validation error

---

## Milestone 2 — Firecrawl Product Extraction (Week 2–3)

- [x] **2.1** Sign up for Firecrawl, store API key in `.env`. Install `@mendable/firecrawl-js`. Write test script scraping `https://example.com`
  - **Verify:** Script logs scraped markdown content, no auth errors
- [x] **2.2** Define `ProductExtraction` TypeScript interface: `name`, `brand`, `price?`, `ingredients[]` (name, amount?, unit?), `claims[]`, `certifications[]`, `imageUrl?`. Add Zod schema
  - **Verify:** Interface compiles; mock object passes Zod validation
- [x] **2.3** Write `extractProduct(url)` using Firecrawl `/scrape` with LLM extraction mode, prompt returns `ProductExtraction` schema
  - **Verify:** Call with real supplement URL — name, brand, and 3+ ingredients populated
- [x] **2.4** Add error handling: try/catch Firecrawl calls. Handle 429 (exponential backoff, max 3 retries), network errors, malformed responses. Log failures with URL
  - **Verify:** Invalid key triggers 3 retries in logs, then clean error (no crash)
- [x] **2.5** Write integration tests: 5 real supplement URLs from different brands. Assert non-empty name, brand, 1+ ingredient. Save results to JSON fixture
  - **Verify:** All 5 pass; fixture file valid; no obviously wrong extractions
- [x] **2.6** Wire `extractProduct()` into `POST /api/analyze`. Accept URL array, extract sequentially, store in `products` table, return JSON
  - **Verify:** POST with 2 URLs -> 2 product objects with ingredients; 2 DB rows inserted

---

## Milestone 3 — Reddit Sentiment Pipeline via Apify (Week 3–4)

> **Pivot (2026-04-12):** Reddit API access requires approval that isn't being granted. Replaced Reddit API integration (tasks 3.1–3.3) with [Apify FREE Reddit Scraper Pro](https://apify.com/spry_wholemeal/reddit-scraper) (actor `RGEBfXu0TSc1siPLb`) which scrapes via public JSON endpoints — no Reddit credentials needed.

- [x] **3.1** Add `APIFY_API_TOKEN` to `.env.example` and `.env`. Remove obsolete `REDDIT_CLIENT_ID` and `REDDIT_SECRET`
  - **Verify:** `.env.example` has `APIFY_API_TOKEN`; no Reddit vars; app boots
- [x] **3.2** Create `src/lib/apify-reddit.ts` with `scrapeRedditPosts(productName)` calling Apify actor via REST API. Zod schemas for post+comment output. Retry logic (3 attempts, exponential backoff). Search mode across all subreddits with high-engagement comments
  - **Verify:** 'Thorne Magnesium Bisglycinate' returns 1+ posts with titles; comments present on high-engagement posts; invalid token triggers 3 retries then clean error
- [x] **3.3** Confirm existing `SentimentResult` schema at `src/lib/schemas/sentiment-result.ts` covers the Apify data flow
  - **Verify:** Import and validate a mock `SentimentResult` with themes derived from Reddit data; Zod `.parse()` succeeds
- [x] **3.4** Install `@google/generative-ai` SDK. Create `src/lib/gemini.ts` (shared client) and `src/lib/sentiment.ts` with `analyzeRedditSentiment(productName, posts)` sending Apify post+comment data to Gemini. Distinguish efficacy reports from hype
  - **Verify:** Real Apify data -> valid `SentimentResult`; score 1-10; 2+ themes; quotes have reddit.com sources
- [x] **3.5** Add `redditSentiment Json?` column to `products` table. Wire sentiment into `POST /api/analyze` after extraction. Sentiment failure stores `null` (does not fail the request)
  - **Verify:** POST response includes extraction + sentiment; DB row has both columns; if Apify is down, extraction still succeeds with `redditSentiment: null`

- [x] **3.6** Stream filtered Reddit posts individually to the frontend via SSE (`reddit-post` events) before sentiment analysis begins. Each post's comments are scored and filtered for relevance (upvotes, keyword matches, engagement, comment length) before being sent. Posts appear incrementally in a collapsible "Reddit Mentions" section with a streaming indicator. After all posts are sent (`reddit-complete`), Gemini processes the filtered set. Each comment links to its original Reddit thread
  - **Verify:** Submit a URL → Reddit posts appear incrementally in the UI before the sentiment score is calculated; user can read raw comments while waiting for Gemini; if Gemini fails, the raw Reddit data is still visible; each comment has a "view on reddit" link
- [x] **3.7** Filter displayed comments using a keyword + score-based relevance system. Comments are scored by: Reddit upvotes, product name mentions, supplement signal keywords (efficacy, dosage, side effects, quality, comparisons), OP status, and comment length. Only comments meeting a minimum relevance threshold are displayed. Implemented in `filterPostComments()` in `src/lib/sentiment.ts`
  - **Verify:** Displayed comments are relevant to the product; off-topic or generic comments are excluded; low-effort one-liners are filtered out
- [x] **3.8** Fix broken Reddit links in sentiment panel — `representativeQuotes` source field includes full reddit.com URLs but `SentimentPanel` prepends an extra `reddit.com`, doubling it
  - **Verify:** Quote source links navigate to correct Reddit threads; no doubled `reddit.com` in URLs
- [x] **3.9** Limit scraping to health-focused subreddits (e.g., r/Supplements, r/Nootropics, r/StackAdvice, r/nutrition) rather than searching all of Reddit. Research which subreddits yield best signal for supplement products
  - **Verify:** Scraper targets specific subreddits; results are higher relevance; irrelevant subreddit posts excluded
- [x] **3.10** Clean up extracted product names before using them as Reddit search queries. Full names like "Kirkland Signature Krill Oil 500 mg" are too specific and return zero results. Strip dosage amounts, unit sizes, brand qualifiers, and other extraneous info to produce a broader search term (e.g. "Kirkland krill oil" or "krill oil"). Consider searching with both a brand-specific and generic query to maximize coverage
  - **Verify:** "Kirkland Signature Krill Oil 500 mg" → finds Reddit posts about krill oil; products with verbose names still return results; search isn't so broad it returns irrelevant posts

---

## Milestone 4 — Product Analysis UI (Week 4)

> Single-product analysis view. First time a user can paste a URL and see results in the browser. Surfaces everything from Milestones 2–3 (extraction + sentiment).

- [x] **4.1** Build `UrlInput` component: single URL text field, validation (http/https), submit button, loading state with animated progress steps ("Scraping product page…", "Searching Reddit…", "Analyzing sentiment…"). React + Tailwind
  - **Verify:** Valid URL -> spinner with progress text; invalid string -> inline error; empty submit blocked
- [x] **4.2** Build `ProductCard` component: product name, brand, price (if available), ingredients list with amounts/units, marketing claims as badges, certifications
  - **Verify:** Mock extraction data renders all fields; missing optional fields (price, imageUrl) degrade gracefully; responsive at 375px and 1200px
- [x] **4.3** Build `SentimentPanel` component: score gauge (1–10, colored: green ≥7, yellow 4–6, red ≤3), confidence badge (low/medium/high), themes list with sentiment icons, representative quotes with clickable Reddit links
  - **Verify:** Mock sentiment data renders; gauge color matches thresholds; quotes link to reddit.com; "low confidence" shows muted styling
- [x] **4.4** Wire into `/scrapaholic` page: submit URL → call `POST /api/analyze` → render `ProductCard` + `SentimentPanel`. Handle API errors with user-friendly message. Show empty state before first analysis
  - **Verify:** Paste a real supplement URL on staging → see extraction + sentiment results; Apify down → extraction renders, sentiment shows "unavailable"; network error → error toast, no crash

---

## Milestone 5 — Verification & Trust Scoring (Week 4–5)

> Backend verification pipeline + trust score UI integrated into the existing product analysis view.

- [x] **5.1** Research and document third-party testing sources: certification programs (NSF Sport, USP Verified, Informed Sport, IFOS, BSCG), independent testing (ConsumerLab), and free APIs (FDA, NIH DSLD, PubMed, ClinicalTrials.gov). Write markdown with access methods, endpoints, and scraping strategies
  - **Verify:** `docs/third-party-testing-research.md` exists with 10+ sources documented; access method identified for each; cache strategy defined
- [ ] **5.1-ui** Add certification source selection to the analysis form. Checkbox group (NSF Sport, USP Verified, Informed Sport, IFOS, BSCG) lets the user pick which sources to check. Default all selected. Pass `certSources: string[]` to `POST /api/analyze`. `checkCertifications()` only queries selected sources
  - **Verify:** Unchecking all cert sources skips certification scraping entirely; selecting only IFOS queries only nutrasource.ca; selections persist visually during loading
- [x] **5.1a** Add `CertificationCache` and `BrandReputation` tables to Prisma schema, run migration
  - **Verify:** `npx prisma db push` succeeds; tables appear in DB; insert + query test row works
- [x] **5.1b** Write `src/lib/certifications/nsf-sport.ts` — Firecrawl scrape of `nsfsport.com/certified-products/search-results.php`, regex-parse markdown, bulk upsert into `CertificationCache`. Raw markdown stored in `ScrapeCache` table (30-day TTL) to avoid re-scraping. 2,254 products across 269 brands
  - **Verify:** Run script → `CertificationCache` rows with `source="nsf_sport"`; known brand (Thorne) returns `certified=true`
- [x] **5.1c** Write `src/lib/certifications/informed-sport.ts` — Firecrawl scrape of `sport.wetestyoutrust.com/supplement-search` + `ScrapeCache` pattern (see nsf-sport.ts). Single page scrape extracts complete brand sidebar (531 brands) + first page product cards (71 products). Brand-level matching provides full coverage without scraping all 83 product pages. Thorne is NOT in Informed Sport (NSF Sport only)
  - **Verify:** Run script → `CertificationCache` rows with `source="informed_sport"`; known brand (Momentous) returns `certified=true`; unknown brand returns `null`
- [ ] **5.1d** Write `src/lib/certifications/ifos.ts` — call AJAX endpoints at `certifications.nutrasource.ca`, parse JSON, cache
  - **Verify:** Search "Nordic Naturals" → `certified=true`; covers IFOS, IKOS, IAOS cert types
- [ ] **5.1e** Write `src/lib/certifications/usp.ts` — Firecrawl scrape + `ScrapeCache` pattern (see nsf-sport.ts). Discover current directory URL, scrape verified products, cache
  - **Verify:** Known USP brand (NOW Foods magnesium) returns `certified=true`
- [ ] **5.1f** Write `src/lib/certifications/index.ts` — unified `checkCertifications(productName, brand, sources?)` with cache-first lookup (30-day TTL). `sources` param filters which providers to query (defaults to all). Only scrapes selected sources. All Firecrawl modules check `ScrapeCache` before scraping
  - **Verify:** First call scrapes + caches; second call returns from cache (no network); expired cache re-scrapes; passing `sources: ['nsf_sport']` only queries NSF
- [ ] **5.1g** Seed `BrandReputation` table with community-sourced ConsumerLab pass rates from Reddit data
  - **Verify:** 10+ brands seeded; `NOW` has `clPassRate=1.0`; `Bulk Supplements` has `clPassRate=0.57`
- [ ] **5.1h** Expand Informed Sport scraper to paginate all ~83 product listing pages (~3,900 products) and optionally scrape individual product detail pages for batch-level test data, certificate numbers, and test dates. Currently MVP uses brand-sidebar-only approach (1 Firecrawl credit per 30-day refresh)
  - **Verify:** Full pagination yields 3,500+ product rows in `CertificationCache`; detail page scrape returns batch/cert metadata in `certDetails`
- [ ] **5.2** Write `checkFDAAdverseEvents(productName, brand)` querying openFDA for adverse events. Return total reports, top 5 reactions, serious event flag
  - **Verify:** Known brand returns data; gibberish name returns zero (no error)
- [ ] **5.3** Write `checkIngredientEvidence(ingredientName, claimedBenefit)` searching PubMed E-utilities. Return study count, RCT flag, LLM-generated evidence summary
  - **Verify:** ('magnesium glycinate', 'sleep') -> count > 0 + coherent summary; ('pixie dust', 'flying') -> 0 studies
- [ ] **5.4** Define `TrustScore` interface: `overall` (0-100), `breakdown` (claimVerification, ingredientEvidence, userSentiment, safetyProfile, **certificationStatus**), `flags[]`, `explanation`. Add Zod schema
  - **Verify:** Compiles; good product (85+) and sketchy product (30-) both pass validation
- [ ] **5.5** Write `calculateTrustScore(extraction, sentiment, fdaData, evidenceData, **certData**)` sending all data to Gemini with scoring rubric: certification status 25%, ingredient evidence 25%, user sentiment 20%, claim verification 15%, safety 15%
  - **Verify:** Real data -> score 0-100; breakdown roughly sums to overall; 1+ flag; coherent explanation; NSF-certified product scores higher than uncertified equivalent
- [ ] **5.6** Wire trust scoring into `POST /api/analyze` as final step. Store in `trust_score` JSON column. Return full analysis
  - **Verify:** POST with 2 URLs -> all data layers per product; DB rows complete; response < 60s
- [ ] **5.7** Build `TrustScoreGauge` component: circular/semicircular gauge (green >70, yellow 40–70, red <40), breakdown bars for each sub-score, flags list with warning/positive/info icons
  - **Verify:** Score 85 -> green gauge; score 35 -> red gauge; breakdown bars proportional; flags render with correct icons
- [ ] **5.8** Build `VerificationDetails` component: FDA adverse events summary (total reports, top reactions, serious event badge), ingredient evidence cards (study count, RCT badge, evidence summary per ingredient)
  - **Verify:** Mock FDA + evidence data renders all sections; zero adverse events shows "No reports found"; ingredients with no studies show "No clinical data"
- [ ] **5.9** Integrate trust score + verification into product analysis page: `TrustScoreGauge` and `VerificationDetails` render below `ProductCard` + `SentimentPanel`. Graceful degradation if verification APIs fail
  - **Verify:** Full pipeline: paste URL → see extraction, sentiment, trust score, FDA data, evidence. FDA API down → trust score still renders with reduced confidence note

---

## Milestone 6 — Comparison View & Recommendations (Week 5–7)

> Multi-product comparison. Extends the single-product view into a side-by-side experience with user selections and community-driven recommendations.

- [ ] **6.1** Extend `UrlInput` to accept 2–4 product URLs. Dynamic add/remove fields, validation per field, shared loading state with per-product progress
  - **Verify:** 2 valid URLs -> spinner; invalid string -> inline error on that field; blocks 0 or >4 URLs; can add/remove URL fields
- [ ] **6.2** Build `ComparisonView`: 2–4 `ProductCard`s side by side (stacked on mobile). Highlight ingredient differences with colored badges (green = unique advantage, red = missing). Show trust score flags beneath each card
  - **Verify:** 2 products side by side on desktop, stacked on mobile; differences highlighted; flags visible
- [ ] **6.3** Add 'Choose This Product' button on each card. POST to `/api/selections` with `{ chosenProductId, comparisonProductIds[], sessionId }`. Store in `selections` table (`id`, `chosen_product_id`, `comparison_ids` JSON, `created_at`)
  - **Verify:** Click -> POST 200; DB row with correct IDs; button shows confirmation state
- [ ] **6.4** Build `GET /api/recommendations` endpoint: top 5 products by selection count per category. Include trust scores. Fall back to trust score ranking if <10 selections
  - **Verify:** 15 mock selections favoring X -> X is #1; <10 selections -> sorted by trust score
- [ ] **6.5** Add 'Popular Verified Alternatives' section below comparison. Call recommendations endpoint, display up to 3 mini-cards (name, brand, trust score, selection count)
  - **Verify:** Alternatives appear with up to 3 products; empty state shows 'Be the first to compare!'
- [ ] **6.6** End-to-end test: paste 2 real URLs on staging, wait for analysis, review comparison, select winner. Refresh + new comparison in same category -> winner appears in recommendations
  - **Verify:** Full flow no errors; no console exceptions; selected product in recommendations; load-to-result < 90s

---

## Post-MVP (Backlog — Unprioritized)

### Feature: Smart Filtering & Sorting

- [ ] **P.7** Build filter/sort toolbar UI above comparison results. Dropdown or toggle controls for sort criteria and filter options. Responsive layout
  - **Verify:** Toolbar renders on desktop and mobile; controls toggle/select without page reload
- [ ] **P.8** Add "Similar Users Picked" recommendation filter: track user search patterns (category, ingredients searched), find users with overlapping searches, surface products those users selected. Query `selections` table joined with search history
  - **Verify:** User who searched magnesium + sleep sees products chosen by others who also searched magnesium + sleep; no results gracefully shows fallback message
- [ ] **P.9** Add sort-by-reliability option: sort products by trust score (descending). Use `TrustScore.overall` from existing scoring pipeline
  - **Verify:** Products reorder by trust score; ties broken by selection count; sort direction toggleable
- [ ] **P.10** Add sort-by-cost option: sort products by price (ascending/descending). Handle missing price gracefully (push to bottom or label "Price unavailable")
  - **Verify:** Products with prices sort correctly; missing-price products grouped at end; toggle asc/desc works
- [ ] **P.11** Add combined/weighted sort: let users combine reliability + cost into a "best value" sort (e.g., trust score per dollar). Display value score badge on cards
  - **Verify:** High trust + low cost ranks above low trust + high cost; badge shows calculated value score
- [ ] **P.12** Persist filter/sort preferences per session using URL query params or localStorage so refreshing the page retains the user's selections
  - **Verify:** Apply filter -> refresh page -> same filter active; share URL with params -> recipient sees same sort

### Reddit & Sentiment Improvements

- [ ] **P.13** DB cache-hit for Reddit sentiment: before calling Apify, check if the `products` table already has `redditSentiment` data for the same product name/brand within a configurable TTL (default 7 days). If cached data exists and is fresh, skip Reddit scraping entirely and reuse stored sentiment. Reduces Apify calls and drops repeat analyses from ~60s to seconds
  - **Verify:** Analyze a product → re-analyze same product within TTL → no Apify call made, sentiment returned from DB; analyze after TTL expires → re-scrapes Reddit; new product with no prior data → scrapes normally
- [ ] **P.16** Stream Reddit results incrementally to the UI — show posts/comments appearing one-by-one as they are parsed instead of rendering the full table after scraping completes

### Other

- [ ] **P.1** Vertical expansion: skincare, health devices, wellness (new extraction schemas + subreddit mappings)
- [ ] **P.2** Redis caching layer: 7-day cache for Firecrawl + Reddit data (~60s -> ~5s for repeats)
- [ ] **P.3** User accounts: NextAuth/Clerk for saved comparisons, tracking, trust score change alerts
- [ ] **P.4** Browser extension: Chrome overlay for trust scores on Amazon, iHerb, brand sites
- [ ] **P.5** API monetization: paid trust scoring API for review sites, health coaches, e-commerce
- [ ] **P.6** Community reviews: authenticated user efficacy reports as first-party data layer
