# Third-Party Testing & Certification Research

**Task:** 5.1 — Research free/scrapeable data sources for supplement verification
**Date:** 2026-04-14
**Source:** Reddit r/Supplements analysis + direct site investigation

---

## Overview

The US supplement industry has no mandatory pre-market testing. Third-party certification programs and independent testing services exist to fill this gap voluntarily. For Scrapaholic's trust score, we need to check whether a product or brand holds any of these certifications and surface that data alongside FDA/PubMed evidence.

**Key finding:** None of the certification databases offer public REST APIs. All require web scraping (Firecrawl) or internal AJAX endpoint calls. This makes a **local cache database essential** to avoid re-scraping on every product analysis.

---

## Tier 1: Certification Programs (Product-Level Verification)

These programs certify individual products through lab testing. A product either has the certification or it doesn't — binary signal, high trust value.

### 1. NSF Certified for Sport

**What it tests:** Label accuracy, contaminants (heavy metals, pesticides, microbes), banned substances
**Why it matters:** Gold standard for athletes; most rigorous of the three certifications

| Detail | Value |
|---|---|
| Search URL | `https://www.nsfsport.com/certified-products/` |
| Results page | `https://www.nsfsport.com/certified-products/search-results.php` |
| Public API | **None** |
| Search fields | Keyword (product name, company, lot number), purpose/goal, product type, brand |
| Data returned | Product name, brand, certification status, NSF listing ID |
| Access method | **Firecrawl scrape** of search results page (renders all ~2,250 products server-side) |

**Scraping strategy (implemented):**
- Firecrawl scrape of the full search results page (`search-results.php` with no filters = all products).
- The page renders product name, brand, and detail link for every certified product — no pagination or JS interaction needed.
- Raw markdown is stored in `ScrapeCache` (30-day TTL) to avoid re-scraping on every refresh.
- Products are regex-parsed from the markdown and bulk-upserted into `CertificationCache`.
- **Yields ~2,250 products across ~270 brands** with clean product↔brand pairing.
- Costs 1 Firecrawl credit per refresh (cached for 30 days).

**Previous approach (abandoned):** PDF download + text parsing from `info.nsf.org/Certified/NFL/DS-ABS_contacts.pdf`. Produced only ~1,000 products with fragile column-based text extraction and unreliable brand matching. The web scrape is strictly superior.

---

### 2. USP Verified

**What it tests:** Label accuracy (ingredients match label claims), contaminants, manufacturing practices (GMP audit)
**Why it matters:** USP is the US Pharmacopeial Convention — the same body that sets drug standards

| Detail | Value |
|---|---|
| Search URL | `https://www.usp.org/verification-services/verified-mark` |
| Verified products directory | `https://www.quality-supplements.org/verified-products` (returned 404 as of 2026-04-14 — may have moved) |
| Public API | **None** |
| Search fields | Unknown — directory may be restructured |
| Data returned | Product name, brand, USP Verified Mark status |
| Access method | **Firecrawl scrape** of product directory (needs URL discovery) |

**Scraping strategy:**
- The verified products directory URL returned 404. Need to re-discover the current listing page.
- USP has historically published a relatively small list (~700M labels but fewer unique products). A full scrape + cache is feasible.
- **Fallback:** Check the product's own page (via Firecrawl extraction in Milestone 2) for "USP Verified" in the certifications field — many brands display this on their product pages.

```bash
# Test: check if the old directory redirects
curl -sI "https://www.quality-supplements.org/verified-products" | head -5
# Try the main USP site
curl -sI "https://www.usp.org/verification-services" | head -5
```

---

### 3. Informed Sport

**What it tests:** Banned substances (WADA prohibited list) — focused on athlete safety
**Why it matters:** Widely recognized in sports nutrition; 2,000+ products, 330+ brands, 132 countries

| Detail | Value |
|---|---|
| Search URL | `https://sport.wetestyoutrust.com/supplement-search` |
| Query pattern | `https://sport.wetestyoutrust.com/supplement-search?search={query}` |
| Public API | **None** (but the search URL accepts query params directly) |
| Search fields | Brand name, product type, batch ID |
| Data returned | Product listing with certification status |
| Access method | **Firecrawl scrape** of search results using query param URL |

**Scraping strategy:**
- The URL pattern `?search={brand_or_product}` makes this the easiest certification to query dynamically.
- Firecrawl the search URL with the product name or brand.

```bash
# Test: search for a known brand
curl -s "https://sport.wetestyoutrust.com/supplement-search?search=thorne" | head -100
```

---

## Tier 2: Specialty Certification

### 4. IFOS (International Fish Oil Standards)

**What it tests:** Oxidation levels, label accuracy, contaminant levels — specifically for omega-3/fish oil products
**Why it matters:** Fish oil is one of the most commonly adulterated supplement categories (oxidation + label inaccuracy)

| Detail | Value |
|---|---|
| Search URL | `https://certifications.nutrasource.ca/certified-products?type=IFOS` |
| Internal AJAX endpoints | `POST /umbraco/surface/NutrasourceContent/GetFilteredBrands` |
| | `POST /umbraco/surface/NutrasourceContent/GetFilteredProducts` |
| | `POST /umbraco/surface/NutrasourceContent/GetProductsByLotNum` |
| Public API | **None** (but AJAX endpoints are callable) |
| Search fields | Brand name, product name, lot number |
| Filter fields | Certification type (IFOS, IKOS Krill, IAOS Algae), interest category, product category |
| Data returned | Product/brand listings with images, paginated (12/page) |
| Access method | **Direct AJAX calls** to internal endpoints (preferred) or Firecrawl scrape |

**Scraping strategy:**
- The AJAX endpoints are the best option here — they're structured, return JSON, and support filtering.
- Can build a direct HTTP client in `src/lib/` to call these endpoints.
- Also covers IKOS (krill oil) and IAOS (algae oil) via the same endpoints.

```bash
# Test: query the AJAX endpoint for filtered brands
curl -s -X POST "https://certifications.nutrasource.ca/umbraco/surface/NutrasourceContent/GetFilteredBrands" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "searchTerm=nordic+naturals&certType=IFOS"
```

---

## Tier 3: Independent Testing Services

### 5. ConsumerLab

**What it is:** Paid subscription service ($42/yr individual) that independently purchases and tests supplements
**Why it matters:** Found 30-40% of popular supplements had meaningful label inaccuracies. Provides per-brand "report cards" aggregating all test results.

| Detail | Value |
|---|---|
| URL | `https://www.consumerlab.com` |
| Public API | **None** |
| Access | **Paywalled** — $42/year subscription |
| Data | Per-product test results, brand pass/fail rates, "Top Pick" designations |
| Programmatic access | **Not viable for MVP** — content behind login + paywall, no API |

**Strategy for MVP:**
- **Do not scrape** — paywalled content, ToS likely prohibits.
- Instead, capture ConsumerLab certification status from the product page itself (Firecrawl extraction already pulls `certifications` field). Brands that pass CL testing often mention it on their own pages.
- **Post-MVP:** Consider a subscription + manual data entry for high-value products, or a partnership/data licensing inquiry.

**Community-sourced brand rankings (from Reddit, based on CL data):**

| Rank | Brand | CL Pass Rate |
|---|---|---|
| 1 (tie) | Jarrow, Nature's Bounty, NOW, Seeking Health | 100% |
| 5 (tie) | Nature Made, Swanson | 90% |
| 7 | Doctor's Best | 89% |
| 8 | Life Extension | 80% |
| 9 | Nature's Way | 78% |
| 10 (tie) | Nutricost, Sports Research | 75% |
| 12 | Solaray | 70% |
| 13 | Bulk Supplements | 57% |

*Note: These rankings are from a Reddit meta-analysis and are contested in the comments. CL's own aggregated brand report cards may differ. Use as a rough heuristic, not ground truth.*

### 6. BSCG (Banned Substance Control Group)

**What it is:** Third-party lab that tests for banned substances, drugs, contaminants, and heavy metals
**Why it matters:** Mentioned by industry professionals as "exceptional" quality

| Detail | Value |
|---|---|
| URL | `https://www.bscg.org` |
| Certified product search | `https://www.bscg.org/certified-drug-free` |
| Public API | **None** |
| Access method | **Firecrawl scrape** of certified product list |

---

## Tier 4: Already in Backlog (Free APIs)

These are documented in tasks 5.1–5.3 and have proper REST APIs:

| Source | Base URL | Auth | Rate Limit | Use Case |
|---|---|---|---|---|
| FDA Adverse Events | `https://api.fda.gov/drug/event.json` | API key (optional, raises limit) | 240/min with key, 40/min without | Safety signal — adverse event reports |
| NIH DSLD | `https://dsld.od.nih.gov/api/` | None | Undocumented | Label claim verification — registered supplement labels |
| PubMed E-utilities | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/` | API key (optional) | 10/sec with key, 3/sec without | Clinical evidence — study counts, RCT presence |
| ClinicalTrials.gov | `https://clinicaltrials.gov/api/v2/` | None | Undocumented | Active/completed trials for ingredients |

---

## Certification Cache Database

### Why We Need It

Every certification check requires a web scrape (Firecrawl credit or HTTP call). Without caching:
- Each product analysis burns 3-5 Firecrawl credits just for certification checks
- Repeated analyses of the same brand waste credits and add latency
- Certification status changes infrequently (quarterly at most)

### Schema (implemented)

See `prisma/schema.prisma` for current definitions. Key tables:

- **`ScrapeCache`** — stores raw Firecrawl markdown per source (keyed by `source`, 30-day TTL). Allows re-parsing without re-scraping. All Firecrawl-based cert modules should store their raw scrape here.
- **`CertificationCache`** — parsed product-level certification records (keyed by `source` + `lookupKey`). Supports product name lookup and brand-contains search.
- **`BrandReputation`** — aggregated brand-level data (CL pass rates, known certs, FDA warnings).

### Cache Strategy

| Source | Refresh Interval | Method |
|---|---|---|
| NSF Sport | 30-day TTL | Firecrawl scrape of full directory → `ScrapeCache` → parse → `CertificationCache` |
| USP Verified | 30-day TTL | Firecrawl scrape of directory → `ScrapeCache` → parse → `CertificationCache` |
| Informed Sport | On-demand + 30-day TTL | Firecrawl query by brand/product → `ScrapeCache` → parse → `CertificationCache` |
| IFOS | On-demand + 30-day TTL | AJAX call → cache in `CertificationCache` (no Firecrawl needed) |
| BSCG | On-demand + 30-day TTL | Firecrawl scrape → `ScrapeCache` → parse → `CertificationCache` |
| Brand reputation | Manual + community data | Seed from Reddit rankings, update as data accumulates |

**Pattern for Firecrawl-based modules:** Check `ScrapeCache` first → if fresh, re-parse from stored markdown → if expired or missing, scrape with Firecrawl, store markdown, then parse. This avoids burning credits on repeated refreshes within the TTL window.

### Lookup Flow

```
checkCertifications(productName, brand)
  1. Query CertificationCache WHERE (brand = X OR lookupKey = X) AND expiresAt > now()
  2. If cache hit → return cached certifications
  3. If cache miss → scrape each source, upsert cache, return results
  4. Return { nsfSport: bool, uspVerified: bool, informedSport: bool, ifos: bool | null, bscg: bool }
```

---

## Implementation Plan (additions to Milestone 5)

### New tasks to add to backlog:

| Task | Description | Status |
|---|---|---|
| **5.1a** | Add `CertificationCache`, `BrandReputation`, `ScrapeCache` tables to Prisma schema | ✅ Done |
| **5.1b** | Write `src/lib/certifications/nsf-sport.ts` — Firecrawl scrape of search results page, parse markdown, bulk upsert cache. Raw markdown stored in `ScrapeCache` for retrieval | ✅ Done |
| **5.1c** | Write `src/lib/certifications/informed-sport.ts` — Firecrawl scrape + `ScrapeCache` pattern, parse results, cache | Pending |
| **5.1d** | Write `src/lib/certifications/ifos.ts` — AJAX endpoint calls, parse JSON, cache | Pending |
| **5.1e** | Write `src/lib/certifications/usp.ts` — Firecrawl scrape + `ScrapeCache` pattern, discover current URL, cache | Pending |
| **5.1f** | Write `src/lib/certifications/index.ts` — unified `checkCertifications()` with cache-first lookup | Pending |
| **5.1g** | Seed `BrandReputation` table with community-sourced CL pass rates from Reddit data | Pending |

### Integration with trust score (task 5.5):

Certification data feeds into the trust score rubric. Suggested weight adjustment:

| Factor | Current Weight | Proposed Weight |
|---|---|---|
| Ingredient evidence (PubMed) | 35% | 25% |
| User sentiment (Reddit) | 25% | 20% |
| Claim verification (LLM) | 25% | 15% |
| Safety profile (FDA) | 15% | 15% |
| **Certification status (NEW)** | — | **25%** |

Certification scoring logic:
- NSF Sport OR USP Verified → +25 points (full marks)
- Informed Sport only → +20 points
- IFOS (fish oil products only) → +25 points
- BSCG only → +15 points
- No certifications found → 0 points
- Brand has high CL pass rate (>90%) → +5 bonus points

---

## Reliable Brands (Community Consensus)

From the Reddit post and comments, these brands consistently show up in third-party verified lists:

| Brand | Certifications | Notes |
|---|---|---|
| Thorne | NSF Certified for Sport | ConsumerLab verified. Premium price. |
| NOW Foods | USP Verified (select products) | Community favorite for quality + price. 100% CL pass rate. |
| Jarrow | — | 100% CL pass rate. |
| Pure Encapsulations | — | Owned by Nestle. Premium price debated. |
| Life Extension | — | 80% CL pass rate. |
| Nordic Naturals | IFOS certified | Gold standard for fish oil. |
| Sports Research | Third-party tested | Good value. Some CL overdosing findings. |

---

## Red Flags to Surface in UI

From the Reddit post and supplementary post on label red flags:

1. **Proprietary blends** — hides individual ingredient doses; even with 3P testing, only total blend weight is verified
2. **No third-party certification** — voluntary but absence is a signal
3. **"FDA Registered Facility"** — legally required, not a quality indicator
4. **Missing botanical standardization** — e.g., "Ashwagandha Extract 500mg" without plant part or withanolide percentage
5. **Sub-clinical dosing** — dose lower than what PubMed studies used (detectable via evidence check)
6. **Amazon third-party sellers** — counterfeiting is documented; buying direct from brand is safer
