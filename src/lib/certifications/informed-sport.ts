import FirecrawlApp from "@mendable/firecrawl-js";
import { prisma } from "../prisma";

const SEARCH_URL =
  "https://sport.wetestyoutrust.com/supplement-search";

const CACHE_TTL_DAYS = 30;

interface InformedSportProduct {
  productName: string;
  brand: string;
  productUrl?: string;
}

const SOURCE_KEY = "informed_sport";

// ── Scrape cache ──────────────────────────────────────────────────

async function getCachedMarkdown(): Promise<string | null> {
  const cached = await prisma.scrapeCache.findUnique({
    where: { source: SOURCE_KEY },
  });
  if (cached && cached.expiresAt > new Date()) {
    return cached.markdown;
  }
  return null;
}

async function storeCachedMarkdown(markdown: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.scrapeCache.upsert({
    where: { source: SOURCE_KEY },
    create: { source: SOURCE_KEY, url: SEARCH_URL, markdown, scrapedAt: now, expiresAt },
    update: { url: SEARCH_URL, markdown, scrapedAt: now, expiresAt },
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
 * Get Informed Sport directory markdown — from scrape cache if fresh,
 * otherwise scrape the live page with Firecrawl and store the result.
 *
 * One page gives us the complete brand sidebar (500+ brands) plus
 * the first page of product cards (~48 products). Since the site
 * has ~83 pages of products, we rely on brand-level matching for
 * coverage rather than scraping all product pages.
 */
async function getInformedSportMarkdown(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = await getCachedMarkdown();
    if (cached) {
      console.log("[informed-sport] Using cached markdown (skipping Firecrawl)");
      return cached;
    }
  }

  console.log("[informed-sport] Scraping Informed Sport directory...");
  const client = getFirecrawlClient();
  const result = await client.v1.scrapeUrl(SEARCH_URL, {
    formats: ["markdown"],
    waitFor: 5000,
  });

  if (!result.success) {
    throw new Error(`Firecrawl scrape failed: ${result.error}`);
  }

  const md = result.markdown;
  if (!md || md.length < 1000) {
    throw new Error("Informed Sport page scrape returned insufficient content");
  }

  await storeCachedMarkdown(md);
  return md;
}

// ── Parsing ────────────────────────────────────────────────────────

/**
 * Extract the complete brand list from the sidebar filter section.
 * The sidebar lists every brand with at least one Informed Sport
 * certified product — this is the full index.
 */
function parseBrands(markdown: string): string[] {
  const brandSection = markdown.match(/###### Brand\n\n([\s\S]*?)###### Category/);
  if (!brandSection) {
    throw new Error("Could not find brand section in Informed Sport markdown");
  }

  return brandSection[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "View More");
}

/**
 * Parse product cards from the directory listing.
 *
 * Each card follows this markdown pattern (from Firecrawl):
 *   [![Brand Logo](logo-url)\\
 *   \\
 *   **Product Name**\\
 *   ...
 *   ](product-url)
 *
 * The brand is extracted from the logo alt text (e.g., "Ascent Logo" → "Ascent").
 */
function parseProducts(markdown: string): InformedSportProduct[] {
  const re =
    /\[!\[([^\]]*?)\s*(?:Logo|logo|_logo)[^\]]*\]\([^)]+\)\\\\\s*\n\s*\\\\\s*\n\s*\*\*([^*]+)\*\*[\s\S]*?\]\((https:\/\/sport\.wetestyoutrust\.com\/supplement-search\/[^)]+)\)/g;

  const products: InformedSportProduct[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(markdown)) !== null) {
    const brand = m[1].replace(/[_\s]*(?:Logo|logo).*$/, "").trim();
    const productName = m[2].trim();
    const productUrl = m[3];

    if (brand && productName) {
      products.push({ productName, brand, productUrl });
    }
  }

  return products;
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
 * Scrape the Informed Sport directory, parse all brands and products,
 * and bulk upsert into the CertificationCache table.
 *
 * Uses cached Firecrawl markdown when available (30-day TTL).
 * Pass forceRefresh=true to re-scrape even if cache is fresh.
 */
export async function refreshInformedSportCache(forceRefresh = false): Promise<number> {
  const markdown = await getInformedSportMarkdown(forceRefresh);

  const brands = parseBrands(markdown);
  const products = parseProducts(markdown);

  if (brands.length === 0) {
    throw new Error("Informed Sport page parsed zero brands — possible format change");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const BATCH_SIZE = 100;
  let upserted = 0;

  // Upsert brands (primary coverage — complete brand index)
  for (let i = 0; i < brands.length; i += BATCH_SIZE) {
    const batch = brands.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((brandName) =>
        prisma.certificationCache.upsert({
          where: {
            source_lookupKey: {
              source: SOURCE_KEY,
              lookupKey: `brand:${toLookupKey(brandName)}`,
            },
          },
          create: {
            source: SOURCE_KEY,
            lookupKey: `brand:${toLookupKey(brandName)}`,
            productName: null,
            brand: brandName,
            certified: true,
            certDetails: { type: "brand" },
            scrapedAt: now,
            expiresAt,
          },
          update: {
            brand: brandName,
            certified: true,
            certDetails: { type: "brand" },
            scrapedAt: now,
            expiresAt,
          },
        })
      )
    );
    upserted += batch.length;
  }

  // Upsert products from page 0 (partial product coverage)
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((p) =>
        prisma.certificationCache.upsert({
          where: {
            source_lookupKey: {
              source: SOURCE_KEY,
              lookupKey: toLookupKey(p.productName),
            },
          },
          create: {
            source: SOURCE_KEY,
            lookupKey: toLookupKey(p.productName),
            productName: p.productName,
            brand: p.brand,
            certified: true,
            certDetails: { type: "product", url: p.productUrl },
            scrapedAt: now,
            expiresAt,
          },
          update: {
            productName: p.productName,
            brand: p.brand,
            certified: true,
            certDetails: { type: "product", url: p.productUrl },
            scrapedAt: now,
            expiresAt,
          },
        })
      )
    );
    upserted += batch.length;
  }

  console.log(
    `[informed-sport] Upserted ${brands.length} brands + ${products.length} products = ${upserted} total`
  );

  return upserted;
}

/**
 * Check if a product or brand has Informed Sport certification.
 * Checks product name first, then falls back to brand lookup.
 * Returns null if no cached data exists.
 */
export async function checkInformedSport(
  productName: string,
  brand: string
): Promise<{ certified: boolean; productName?: string; brand?: string } | null> {
  const now = new Date();

  // 1. Try exact product name match
  const byProduct = await prisma.certificationCache.findFirst({
    where: {
      source: SOURCE_KEY,
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

  // 2. Try exact brand match (brand: prefix key)
  const byBrandKey = await prisma.certificationCache.findFirst({
    where: {
      source: SOURCE_KEY,
      lookupKey: `brand:${toLookupKey(brand)}`,
      expiresAt: { gt: now },
    },
  });

  if (byBrandKey) {
    return {
      certified: true,
      brand: byBrandKey.brand ?? undefined,
    };
  }

  // 3. Fuzzy brand match (contains)
  const byBrand = await prisma.certificationCache.findFirst({
    where: {
      source: SOURCE_KEY,
      brand: { contains: brand, mode: "insensitive" },
      certified: true,
      expiresAt: { gt: now },
    },
  });

  if (byBrand) {
    return {
      certified: true,
      brand: byBrand.brand ?? undefined,
    };
  }

  return null;
}

export { parseBrands, parseProducts, normalizeBrand, toLookupKey, getCachedMarkdown };
