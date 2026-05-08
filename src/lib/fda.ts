import {
  fdaAdverseEventsResultSchema,
  type FDAAdverseEventsResult,
  type FDAReaction,
} from "./schemas/fda-adverse-events";

const BASE_URL = "https://api.fda.gov/drug/event.json";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function getFdaApiKey(): string | undefined {
  return process.env.FDA_API_KEY;
}

/**
 * Build a URL for the openFDA drug/event API.
 * Appends the API key if available (raises rate limit from 40 to 240 req/min).
 */
function buildUrl(params: Record<string, string>): string {
  const parts: string[] = [];
  const apiKey = getFdaApiKey();
  if (apiKey) {
    parts.push(`api_key=${encodeURIComponent(apiKey)}`);
  }
  // openFDA expects search queries with raw colons, quotes, and +AND+
  // URLSearchParams over-encodes these, breaking the API
  for (const [key, value] of Object.entries(params)) {
    parts.push(`${key}=${value}`);
  }
  return `${BASE_URL}?${parts.join("&")}`;
}

/**
 * Normalize a product or brand name for FDA search.
 * Strips dosage info, special characters, and excess whitespace.
 */
function normalizeSearchTerm(term: string): string {
  return term
    .replace(/\d+\s*(mg|mcg|g|ml|iu|oz|ct|count|capsules?|tablets?|softgels?)\b/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Fetch from openFDA with exponential backoff retry.
 * Returns parsed JSON or null if no matches found (404).
 */
async function fetchFDA(
  params: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const url = buildUrl(params);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 404) {
        return null; // No matches — not an error
      }

      if (!response.ok) {
        if (isRetryable(response.status) && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(
            `[fda] Retryable ${response.status}, attempt ${attempt}/${MAX_RETRIES}, waiting ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(
          `openFDA API error: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;

      const isNetwork =
        error instanceof Error &&
        (error.message.includes("fetch") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT"));

      if (isNetwork) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[fda] Network error, attempt ${attempt}/${MAX_RETRIES}, waiting ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw new Error("[fda] Exhausted retries");
}

/**
 * Extract total count from an openFDA meta response.
 */
function extractTotal(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const meta = data.meta as { results?: { total?: number } } | undefined;
  return meta?.results?.total ?? 0;
}

/**
 * Query openFDA for adverse event reports matching a product name or brand.
 *
 * Makes up to 3 API calls:
 * 1. Total report count (using limit=0 to skip results)
 * 2. Serious report count
 * 3. Top 5 reactions via the count endpoint
 *
 * Searches `patient.drug.medicinalproduct` which covers both branded
 * and generic supplement names in FAERS data.
 *
 * Returns null-safe results — unknown products return zero counts, not errors.
 */
export async function checkFDAAdverseEvents(
  productName: string,
  brand: string,
): Promise<FDAAdverseEventsResult> {
  // Try product name first, fall back to brand if no results
  const productTerm = normalizeSearchTerm(productName);
  const brandTerm = normalizeSearchTerm(brand);

  let searchTerm = productTerm;
  let searchQuery = `patient.drug.medicinalproduct:"${searchTerm}"`;

  // Get total reports for the product name
  let totalData = await fetchFDA({ search: searchQuery, limit: "0" });
  let totalReports = extractTotal(totalData);

  // If no results for product name, try brand
  if (totalReports === 0 && brandTerm && brandTerm !== productTerm) {
    searchTerm = brandTerm;
    searchQuery = `patient.drug.medicinalproduct:"${searchTerm}"`;
    totalData = await fetchFDA({ search: searchQuery, limit: "0" });
    totalReports = extractTotal(totalData);
  }

  // No reports at all — return clean zero result
  if (totalReports === 0) {
    return fdaAdverseEventsResultSchema.parse({
      totalReports: 0,
      seriousReports: 0,
      hasSeriousEvents: false,
      topReactions: [],
      searchTermUsed: searchTerm,
    });
  }

  // Get serious event count and top reactions in parallel
  const [seriousData, reactionsData] = await Promise.all([
    fetchFDA({
      search: `${searchQuery}+AND+serious:1`,
      limit: "0",
    }),
    fetchFDA({
      search: searchQuery,
      count: "patient.reaction.reactionmeddrapt.exact",
      limit: "5",
    }),
  ]);

  const seriousReports = extractTotal(seriousData);

  const topReactions: FDAReaction[] = [];
  if (reactionsData?.results && Array.isArray(reactionsData.results)) {
    for (const r of reactionsData.results as { term: string; count: number }[]) {
      topReactions.push({ term: r.term, count: r.count });
    }
  }

  return fdaAdverseEventsResultSchema.parse({
    totalReports,
    seriousReports,
    hasSeriousEvents: seriousReports > 0,
    topReactions,
    searchTermUsed: searchTerm,
  });
}
