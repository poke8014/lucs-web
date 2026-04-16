/**
 * Build cleaned, multi-specificity Reddit search queries from an extracted
 * product name and brand.  Designed to be reusable for multi-URL comparison
 * flows (Milestone 6) where each product generates its own query set.
 */

// --- Noise patterns to strip from extracted product names ---

const NOISE_PATTERNS: RegExp[] = [
  // Dosages: "500 mg", "1000 IU", "5000 mcg", "2.5 g"
  /\d+(?:\.\d+)?\s*(mg|mcg|g|iu|µg)\b/gi,
  // Unit counts: "180 softgels", "240 capsules", "60 ct", "30 servings"
  /\d+\s*(softgels?|capsules?|tablets?|gummies?|ct|count|caps|tabs|vcaps|vegcaps|packets?|servings?|fl\.?\s*oz|oz|ml|lbs?|pounds?)\b/gi,
  // Standalone packaging nouns (after adjective like "vegetarian" is stripped)
  /\b(softgels?|capsules?|tablets?|gummies?|caps|tabs|vcaps|vegcaps|packets?)\b/gi,
  // Bare numbers left over after other stripping (e.g. "30" from "30 Vegetarian Capsules")
  /\b\d+\b/g,
  // Pack info: "pack of 3", "2-pack", "3 pack"
  /\b(pack of \d+|\d+[\s-]?pack)\b/gi,
  // Marketing qualifiers
  /\b(vegetarian|vegan|organic|non[\s-]?gmo|gluten[\s-]?free|sugar[\s-]?free|dairy[\s-]?free|soy[\s-]?free)\b/gi,
  // Supplement marketing terms
  /\b(dietary supplement|supplement facts?|professional grade|clinical strength|maximum strength|extra strength|high potency|advanced formula)\b/gi,
  // Trademark symbols
  /[®™©]/g,
  // Parenthetical info: "(formerly MegaFood)", "(Pack of 2)"
  /\(.*?\)/g,
];

// Final cleanup: collapse whitespace, strip trailing punctuation artifacts
const TRAILING_PUNCT = /[\s,\-–—]+$/;
const LEADING_PUNCT = /^[\s,\-–—]+/;
const MULTI_SPACE = /\s{2,}/g;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip dosages, unit counts, marketing terms, and other noise from
 * an extracted product name.
 */
export function cleanProductName(name: string): string {
  let cleaned = name;
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned
    .replace(MULTI_SPACE, " ")
    .replace(TRAILING_PUNCT, "")
    .replace(LEADING_PUNCT, "")
    .trim();
}

/**
 * Extract the generic product term by stripping the brand from the name.
 * Returns null if nothing meaningful remains after stripping.
 */
function getGenericProduct(
  cleanedName: string,
  brand: string,
): string | null {
  if (!brand) return cleanedName || null;

  const nameLower = cleanedName.toLowerCase();
  const brandLower = brand.toLowerCase();

  // Brand appears at the start — strip it
  if (nameLower.startsWith(brandLower)) {
    const remainder = cleanedName.slice(brand.length).trim();
    return remainder || null;
  }

  // Brand appears anywhere — strip it
  if (nameLower.includes(brandLower)) {
    const remainder = cleanedName
      .replace(new RegExp(escapeRegex(brand), "i"), "")
      .replace(MULTI_SPACE, " ")
      .trim();
    return remainder || null;
  }

  // Partial brand match: name starts with a word from the brand
  // e.g. brand="NOW Foods", name="NOW Vitamin D3" → strip "NOW"
  const brandWords = brand.split(/\s+/);
  for (let i = brandWords.length - 1; i >= 1; i--) {
    const partial = brandWords.slice(0, i).join(" ");
    if (nameLower.startsWith(partial.toLowerCase())) {
      const remainder = cleanedName.slice(partial.length).trim();
      return remainder || null;
    }
  }

  // Brand not found in name — the whole cleaned name is the generic term
  return cleanedName || null;
}

/**
 * Build 1–3 search queries of varying specificity from a product name and brand.
 *
 * Returns deduplicated queries ordered from most to least specific:
 *   1. Brand + generic product (e.g. "Kirkland Signature Krill Oil")
 *   2. Generic product only  (e.g. "Krill Oil")
 *   3. Full cleaned name (only if different from the above)
 */
export function buildSearchQueries(name: string, brand: string): string[] {
  const cleaned = cleanProductName(name);
  const generic = getGenericProduct(cleaned, brand);
  const seen = new Set<string>();
  const queries: string[] = [];

  function add(q: string) {
    const key = q.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    queries.push(q);
  }

  // Query 1 (most specific): Brand + generic product
  if (brand && generic && generic.toLowerCase() !== brand.toLowerCase()) {
    add(`${brand} ${generic}`);
  } else {
    add(cleaned);
  }

  // Query 2 (broadest): Just the generic product
  if (generic) {
    add(generic);
  }

  // Query 3: Full cleaned name if meaningfully different
  add(cleaned);

  return queries;
}
