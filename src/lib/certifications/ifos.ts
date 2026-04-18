import { prisma } from "../prisma";

const SOURCE_KEY = "ifos";

const CACHE_TTL_DAYS = 30;

const BASE_URL =
  "https://certifications.nutrasource.ca/umbraco/surface/NutrasourceContent";

const CERT_TYPES = ["IFOS", "IKOS", "IAOS", "IGEN", "IPRO", "RTCP", "NutraStrong"] as const;
type CertType = (typeof CERT_TYPES)[number];

interface NutrasourceBrand {
  BrandId: string;
  Name: string;
  HasIfos: boolean;
  HasIkos: boolean;
  HasIAOS: boolean;
  HasIgen: boolean;
  HasIpro: boolean;
  HasRTCP: boolean;
  HasNutraStrong: boolean;
}

interface NutrasourceProduct {
  ProductNum: string;
  ProductName: string;
  IsIfos: boolean;
  IsIkos: boolean;
  IsIaos: boolean;
  IsIgen: boolean;
  IsIpro: boolean;
  IsRtcp: boolean;
  IsNutraStrong: boolean;
}

interface BrandsResponse {
  success: boolean;
  list: NutrasourceBrand[];
  totalCount: number;
}

interface ProductsResponse {
  success: boolean;
  list: NutrasourceProduct[];
  totalCount: number;
}

// ── API helpers ──────────────────────────────────────────────────

async function fetchBrandsPage(
  page: number,
  pageSize: number,
): Promise<BrandsResponse> {
  const params = new URLSearchParams({
    pageNumber: String(page),
    pageSize: String(pageSize),
    byName: "",
    forCertification: "",
    forInterest: "",
    forCategory: "",
  });

  const res = await fetch(`${BASE_URL}/GetFilteredBrands?${params}`, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  if (!res.ok) {
    throw new Error(`Nutrasource brands API returned ${res.status}`);
  }

  return res.json() as Promise<BrandsResponse>;
}

async function fetchProductsPage(
  page: number,
  pageSize: number,
): Promise<ProductsResponse> {
  const params = new URLSearchParams({
    pageNumber: String(page),
    pageSize: String(pageSize),
    byName: "",
    forCertification: "",
    forInterest: "",
    forCategory: "",
  });

  const res = await fetch(`${BASE_URL}/GetFilteredProducts?${params}`, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  if (!res.ok) {
    throw new Error(`Nutrasource products API returned ${res.status}`);
  }

  return res.json() as Promise<ProductsResponse>;
}

/**
 * Paginate through all results from a Nutrasource endpoint.
 */
async function fetchAll<T>(
  fetcher: (page: number, pageSize: number) => Promise<{ list: T[]; totalCount: number }>,
  pageSize = 100,
): Promise<T[]> {
  const first = await fetcher(1, pageSize);
  const all = [...first.list];
  const totalPages = Math.ceil(first.totalCount / pageSize);

  for (let page = 2; page <= totalPages; page++) {
    const result = await fetcher(page, pageSize);
    all.push(...result.list);
  }

  return all;
}

// ── Normalization ───────────────────────────────────────────────

function toLookupKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function certFlags(item: NutrasourceProduct | NutrasourceBrand): CertType[] {
  const flags: CertType[] = [];
  if ("IsIfos" in item) {
    if (item.IsIfos) flags.push("IFOS");
    if (item.IsIkos) flags.push("IKOS");
    if (item.IsIaos) flags.push("IAOS");
    if (item.IsIgen) flags.push("IGEN");
    if (item.IsIpro) flags.push("IPRO");
    if (item.IsRtcp) flags.push("RTCP");
    if (item.IsNutraStrong) flags.push("NutraStrong");
  } else {
    if (item.HasIfos) flags.push("IFOS");
    if (item.HasIkos) flags.push("IKOS");
    if (item.HasIAOS) flags.push("IAOS");
    if (item.HasIgen) flags.push("IGEN");
    if (item.HasIpro) flags.push("IPRO");
    if (item.HasRTCP) flags.push("RTCP");
    if (item.HasNutraStrong) flags.push("NutraStrong");
  }
  return flags;
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Fetch all IFOS/IKOS/IAOS brands and products from the Nutrasource
 * AJAX API and bulk upsert into CertificationCache.
 *
 * No Firecrawl credits needed — uses direct HTTP GET to JSON endpoints.
 */
export async function refreshIfosCache(forceRefresh = false): Promise<number> {
  if (!forceRefresh) {
    const cached = await prisma.scrapeCache.findUnique({
      where: { source: SOURCE_KEY },
    });
    if (cached && cached.expiresAt > new Date()) {
      console.log("[ifos] Cache is fresh, skipping refresh");
      return 0;
    }
  }

  console.log("[ifos] Fetching all IFOS/IKOS/IAOS brands and products...");

  const [brands, products] = await Promise.all([
    fetchAll(fetchBrandsPage),
    fetchAll(fetchProductsPage),
  ]);

  console.log(
    `[ifos] Fetched ${brands.length} brands, ${products.length} products`,
  );

  // Build brand lookup: BrandId → brand name
  const brandMap = new Map<string, string>();
  for (const b of brands) {
    brandMap.set(b.BrandId, b.Name);
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  let upserted = 0;

  // Upsert brands with brand: prefix lookup keys
  const BATCH_SIZE = 100;
  for (let i = 0; i < brands.length; i += BATCH_SIZE) {
    const batch = brands.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((b) =>
        prisma.certificationCache.upsert({
          where: {
            source_lookupKey: {
              source: SOURCE_KEY,
              lookupKey: `brand:${toLookupKey(b.Name)}`,
            },
          },
          create: {
            source: SOURCE_KEY,
            lookupKey: `brand:${toLookupKey(b.Name)}`,
            productName: null,
            brand: b.Name,
            certified: true,
            certDetails: {
              brandId: b.BrandId,
              certTypes: certFlags(b),
            },
            scrapedAt: now,
            expiresAt,
          },
          update: {
            brand: b.Name,
            certified: true,
            certDetails: {
              brandId: b.BrandId,
              certTypes: certFlags(b),
            },
            scrapedAt: now,
            expiresAt,
          },
        }),
      ),
    );
    upserted += batch.length;
  }

  // Upsert products with product name lookup keys
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((p) => {
        const brandId = p.ProductNum.substring(0, 4);
        const brandName = brandMap.get(brandId) ?? null;
        return prisma.certificationCache.upsert({
          where: {
            source_lookupKey: {
              source: SOURCE_KEY,
              lookupKey: toLookupKey(p.ProductName),
            },
          },
          create: {
            source: SOURCE_KEY,
            lookupKey: toLookupKey(p.ProductName),
            productName: p.ProductName,
            brand: brandName,
            certified: true,
            certDetails: {
              productNum: p.ProductNum,
              certTypes: certFlags(p),
            },
            scrapedAt: now,
            expiresAt,
          },
          update: {
            productName: p.ProductName,
            brand: brandName,
            certified: true,
            certDetails: {
              productNum: p.ProductNum,
              certTypes: certFlags(p),
            },
            scrapedAt: now,
            expiresAt,
          },
        });
      }),
    );
    upserted += batch.length;
  }

  // Store a scrape cache marker (no raw markdown — this is JSON-based)
  await prisma.scrapeCache.upsert({
    where: { source: SOURCE_KEY },
    create: {
      source: SOURCE_KEY,
      url: BASE_URL,
      markdown: `Fetched ${brands.length} brands, ${products.length} products`,
      scrapedAt: now,
      expiresAt,
    },
    update: {
      markdown: `Fetched ${brands.length} brands, ${products.length} products`,
      scrapedAt: now,
      expiresAt,
    },
  });

  console.log(`[ifos] Upserted ${upserted} cache entries`);
  return upserted;
}

/**
 * Check if a product or brand holds IFOS, IKOS, or IAOS certification.
 * Returns null if no cached data exists for this product/brand.
 */
export async function checkIfos(
  productName: string,
  brand: string,
): Promise<{
  certified: boolean;
  productName?: string;
  brand?: string;
  certTypes?: string[];
} | null> {
  // 1. Try exact product name match
  const byProduct = await prisma.certificationCache.findFirst({
    where: {
      source: SOURCE_KEY,
      lookupKey: toLookupKey(productName),
    },
  });

  if (byProduct) {
    const details = byProduct.certDetails as Record<string, unknown> | null;
    return {
      certified: byProduct.certified,
      productName: byProduct.productName ?? undefined,
      brand: byProduct.brand ?? undefined,
      certTypes: (details?.certTypes as string[]) ?? undefined,
    };
  }

  // 2. Try brand key lookup
  const byBrandKey = await prisma.certificationCache.findFirst({
    where: {
      source: SOURCE_KEY,
      lookupKey: `brand:${toLookupKey(brand)}`,
    },
  });

  if (byBrandKey) {
    const details = byBrandKey.certDetails as Record<string, unknown> | null;
    return {
      certified: true,
      brand: byBrandKey.brand ?? undefined,
      certTypes: (details?.certTypes as string[]) ?? undefined,
    };
  }

  // 3. Fuzzy brand match
  const byBrandFuzzy = await prisma.certificationCache.findFirst({
    where: {
      source: SOURCE_KEY,
      brand: { contains: brand, mode: "insensitive" },
      certified: true,
    },
  });

  if (byBrandFuzzy) {
    const details = byBrandFuzzy.certDetails as Record<string, unknown> | null;
    return {
      certified: true,
      productName: byBrandFuzzy.productName ?? undefined,
      brand: byBrandFuzzy.brand ?? undefined,
      certTypes: (details?.certTypes as string[]) ?? undefined,
    };
  }

  return null;
}

export { toLookupKey };
