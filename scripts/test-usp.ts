/**
 * Test script for USP Verified certification module.
 *
 * Usage: npx tsx scripts/test-usp.ts
 *
 * Tests:
 * 1. Firecrawl scrape of USP directory (or cache hit)
 * 2. Brand and product parsing from markdown
 * 3. Cache refresh (bulk upsert)
 * 4. Known brand lookups (Nature Made, Kirkland Signature)
 * 5. Negative lookups (unknown brand)
 * 6. Cache hit on second refresh
 */
import "dotenv/config";

async function main() {
  const { refreshUspCache, checkUsp, parseBrands, parseProducts } =
    await import("../src/lib/certifications/usp");

  console.log("=== USP Verified Certification Test ===\n");

  // Step 1: Refresh cache (scrape or cache hit)
  if (!process.env.DATABASE_URL) {
    console.log("   ✗ DATABASE_URL not set — cannot test DB operations");
    process.exit(1);
  }

  console.log("1. Refreshing USP cache (scrape + upsert)...");
  const count = await refreshUspCache(true);
  console.log(`   ✓ Upserted ${count} cache entries\n`);

  // Step 2: Known brand lookups
  console.log("2. Testing known brand lookups...");
  const brandTests = [
    { product: "Some Vitamin", brand: "Nature Made", expectCert: true },
    { product: "Some Vitamin", brand: "Kirkland Signature", expectCert: true },
    { product: "Some Vitamin", brand: "Ritual", expectCert: true },
    { product: "Some Vitamin", brand: "trunature", expectCert: true },
    { product: "Some Vitamin", brand: "Member's Mark", expectCert: true },
  ];

  for (const t of brandTests) {
    const result = await checkUsp(t.product, t.brand);
    const pass = t.expectCert ? result?.certified === true : result === null;
    console.log(
      `   ${pass ? "✓" : "✗"} checkUsp("${t.product}", "${t.brand}") → ${
        result ? `certified=${result.certified}, brand=${result.brand}` : "null"
      }`,
    );
  }

  // Step 3: Product-level lookups (from page 0 products)
  console.log("\n3. Testing product name lookups...");
  const productTests = [
    "Member's Mark CoQ10 200mg Softgels",
    "Culturelle Digestive Daily Probiotic Vegetarian Capsules",
  ];
  for (const name of productTests) {
    const result = await checkUsp(name, "Unknown");
    console.log(
      `   ${result ? "✓" : "?"} checkUsp("${name}") → ${
        result
          ? `certified=${result.certified}, brand=${result.brand}`
          : "null (may not be on page 0)"
      }`,
    );
  }

  // Step 4: Negative lookup
  console.log("\n4. Testing negative lookup...");
  const negResult = await checkUsp("Fake Supplement XYZ", "FakeBrand");
  console.log(
    `   ${negResult === null ? "✓" : "✗"} checkUsp("FakeBrand") → ${negResult ?? "null"}`,
  );

  // Step 5: Second call should use cache
  console.log("\n5. Testing cache hit (second refresh should skip)...");
  const count2 = await refreshUspCache(false);
  console.log(
    `   ${count2 === 0 ? "✓" : "✗"} Second refresh returned ${count2} (expected 0 = cache hit)`,
  );

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
