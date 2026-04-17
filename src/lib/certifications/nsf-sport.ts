import FirecrawlApp from "@mendable/firecrawl-js";
import { prisma } from "../prisma";

const NSF_SEARCH_URL =
  "https://www.nsfsport.com/certified-products/search-results.php";

const CACHE_TTL_DAYS = 30;

interface NsfProduct {
  productName: string;
  brand: string;
  nsfId?: string;
}

const SOURCE_KEY = "nsf_sport";

// ── Scrape cache ──────────────────────────────────────────────────

/**
 * Return cached Firecrawl markdown if it exists and hasn't expired.
 * Avoids burning a Firecrawl credit on every refresh.
 */
async function getCachedMarkdown(): Promise<string | null> {
  const cached = await prisma.scrapeCache.findUnique({
    where: { source: SOURCE_KEY },
  });
  if (cached && cached.expiresAt > new Date()) {
    return cached.markdown;
  }
  return null;
}

/**
 * Store raw Firecrawl markdown in the scrape cache for later retrieval.
 */
async function storeCachedMarkdown(markdown: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.scrapeCache.upsert({
    where: { source: SOURCE_KEY },
    create: { source: SOURCE_KEY, url: NSF_SEARCH_URL, markdown, scrapedAt: now, expiresAt },
    update: { url: NSF_SEARCH_URL, markdown, scrapedAt: now, expiresAt },
  });
}

// ── Scraping ───────────────────────────────────────────────────────

function getFirecrawlClient() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("Missing FIRECRAWL_API_KEY environment variable");
  }
  return new FirecrawlApp({ apiKey });
}

/**
 * Get NSF product markdown — from scrape cache if fresh, otherwise
 * scrape the live page with Firecrawl and store the result.
 */
async function getNsfMarkdown(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = await getCachedMarkdown();
    if (cached) {
      console.log("[nsf-sport] Using cached markdown (skipping Firecrawl)");
      return cached;
    }
  }

  console.log("[nsf-sport] Scraping NSF Certified for Sport page...");
  const client = getFirecrawlClient();
  const result = await client.v1.scrapeUrl(NSF_SEARCH_URL, {
    formats: ["markdown"],
    waitFor: 3000,
  });

  if (!result.success) {
    throw new Error(`Firecrawl scrape failed: ${result.error}`);
  }

  const md = result.markdown;
  if (!md || md.length < 1000) {
    throw new Error("NSF page scrape returned insufficient content");
  }

  await storeCachedMarkdown(md);
  return md;
}

/**
 * Parse the scraped markdown into product–brand pairs.
 *
 * Each product listing in the markdown follows this pattern:
 *   productName\\
 *   \\
 *   brand](https://www.nsfsport.com/certified-products/listing-detail.php?id=NNNN)
 */
function parseProducts(markdown: string): NsfProduct[] {
  const re =
    /([^\n\\]+)\\\\\s*\n\s*\\?\\\s*\n\s*([^\]\\]+)\]\(https:\/\/www\.nsfsport\.com\/certified-products\/listing-detail\.php\?id=(\d+)\)/g;

  const seen = new Map<string, NsfProduct>();
  let m: RegExpExecArray | null;

  while ((m = re.exec(markdown)) !== null) {
    const productName = m[1].trim();
    const brand = normalizeBrand(m[2].trim());
    const nsfId = m[3];

    // Deduplicate by NSF listing ID (same product may appear in family + individual views)
    if (!seen.has(nsfId)) {
      seen.set(nsfId, { productName, brand, nsfId });
    }
  }

  return Array.from(seen.values());
}

// ── Normalization ───────────────────────────────────────────────────

function normalizeBrand(raw: string): string {
  return raw
    .replace(/\b(LLC|Inc\.?|Corp\.?|Ltd\.?|L\.?P\.?|GmbH|S\.A\.?|Co\.?)\b/gi, "")
    .replace(/\bDBA\s+/gi, "")
    .replace(/[.,]+\s*$/g, "")
    .replace(/,+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toLookupKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Scrape the NSF Certified for Sport directory, parse all products,
 * and bulk upsert into the CertificationCache table.
 *
 * Uses cached Firecrawl markdown when available (30-day TTL).
 * Pass forceRefresh=true to re-scrape even if cache is fresh.
 */
export async function refreshNsfSportCache(forceRefresh = false): Promise<number> {
  const markdown = await getNsfMarkdown(forceRefresh);
  const products = parseProducts(markdown);

  if (products.length === 0) {
    throw new Error("NSF page parsed zero products — possible format change");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const BATCH_SIZE = 100;
  let upserted = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((p) =>
        prisma.certificationCache.upsert({
          where: {
            source_lookupKey: {
              source: "nsf_sport",
              lookupKey: toLookupKey(p.productName),
            },
          },
          create: {
            source: "nsf_sport",
            lookupKey: toLookupKey(p.productName),
            productName: p.productName,
            brand: p.brand,
            certified: true,
            certDetails: { nsfId: p.nsfId },
            scrapedAt: now,
            expiresAt,
          },
          update: {
            productName: p.productName,
            brand: p.brand,
            certified: true,
            certDetails: { nsfId: p.nsfId },
            scrapedAt: now,
            expiresAt,
          },
        })
      )
    );
    upserted += batch.length;
  }

  return upserted;
}

/**
 * Check if a product or brand is NSF Certified for Sport.
 * Returns null if no cached data exists.
 */
export async function checkNsfSport(
  productName: string,
  brand: string
): Promise<{ certified: boolean; productName?: string; brand?: string } | null> {
  const now = new Date();

  const byProduct = await prisma.certificationCache.findFirst({
    where: {
      source: "nsf_sport",
      lookupKey: toLookupKey(productName),
      expiresAt: { gt: now },
    },
  });

  if (byProduct) {
    return {
      certified: byProduct.certified,
      productName: byProduct.productName ?? undefined,
      brand: byProduct.brand ?? undefined,
    };
  }

  const byBrand = await prisma.certificationCache.findFirst({
    where: {
      source: "nsf_sport",
      brand: { contains: brand, mode: "insensitive" },
      certified: true,
      expiresAt: { gt: now },
    },
  });

  if (byBrand) {
    return {
      certified: true,
      productName: byBrand.productName ?? undefined,
      brand: byBrand.brand ?? undefined,
    };
  }

  return null;
}

export { parseProducts, normalizeBrand, toLookupKey, getCachedMarkdown };
