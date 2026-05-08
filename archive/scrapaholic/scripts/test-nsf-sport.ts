/**
 * Test script for NSF Sport certification module.
 *
 * Usage: npx tsx scripts/test-nsf-sport.ts
 *
 * Tests:
 * 1. Firecrawl scrape of NSF search results page
 * 2. Product parsing (count, structure, brand pairing)
 * 3. Known brand lookups (Thorne, Klean Athlete, Momentous)
 * 4. DB upsert into CertificationCache
 * 5. DB lookup queries
 */
import "dotenv/config";

async function main() {
  const { parseProducts, normalizeBrand, toLookupKey, refreshNsfSportCache, checkNsfSport } =
    await import("../src/lib/certifications/nsf-sport");
  const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;

  console.log("=== NSF Sport Certification Test ===\n");

  // Step 1: Scrape the NSF search results page
  console.log("1. Scraping NSF Certified for Sport search results...");
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error("   ✗ FIRECRAWL_API_KEY not set — cannot proceed");
    process.exit(1);
  }

  const client = new FirecrawlApp({ apiKey });
  const result = await client.v1.scrapeUrl(
    "https://www.nsfsport.com/certified-products/search-results.php",
    { formats: ["markdown"], waitFor: 3000 }
  );

  if (!result.success || !result.markdown) {
    console.error("   ✗ FAIL: Firecrawl scrape failed");
    process.exit(1);
  }
  console.log(`   Scraped ${result.markdown.length} chars of markdown`);
  console.log("   ✓ Scrape OK\n");

  // Step 2: Parse products
  console.log("2. Parsing products...");
  const products = parseProducts(result.markdown);
  console.log(`   Found ${products.length} unique products`);

  if (products.length === 0) {
    console.error("   ✗ FAIL: Zero products parsed!");
    process.exit(1);
  }
  if (products.length < 1000) {
    console.warn(`   ⚠ WARNING: Only ${products.length} products (expected 2000+)`);
  }

  // Show first 10 products as a sample
  console.log("   Sample products:");
  for (const p of products.slice(0, 10)) {
    console.log(`     - "${p.productName}" by "${p.brand}"`);
  }

  // Step 3: Check for known brands
  console.log("\n3. Checking known brands...");
  const knownBrands = ["Thorne", "Klean Athlete", "Momentous", "Gatorade", "1st Phorm"];
  for (const brandName of knownBrands) {
    const found = products.filter(
      (p) => p.brand.toLowerCase().includes(brandName.toLowerCase())
    );
    console.log(`   ${found.length > 0 ? "✓" : "✗"} ${brandName}: ${found.length} products`);
    if (found.length > 0) {
      console.log(`     e.g. "${found[0].productName}"`);
    }
  }

  // Step 4: Test normalization helpers
  console.log("\n4. Testing helpers...");
  const testCases = [
    { input: "Woodbolt Distribution LLC DBA Nutrabolt", expected: "Woodbolt Distribution Nutrabolt" },
    { input: "Thorne®", expected: "Thorne®" },
    { input: "CELSIUS®", expected: "CELSIUS®" },
  ];
  for (const tc of testCases) {
    const result = normalizeBrand(tc.input);
    const pass = result.trim() === tc.expected;
    console.log(`   ${pass ? "✓" : "✗"} normalizeBrand("${tc.input}") = "${result}" ${pass ? "" : `(expected "${tc.expected}")`}`);
  }
  console.log(`   toLookupKey("Thorne® Amino Complex") = "${toLookupKey("Thorne® Amino Complex")}"`);

  // Step 5: Brand distribution
  console.log("\n5. Brand distribution (top 10):");
  const brandCounts = new Map<string, number>();
  for (const p of products) {
    brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);
  }
  const sorted = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [brand, count] of sorted.slice(0, 10)) {
    console.log(`   ${count.toString().padStart(4)} ${brand}`);
  }
  console.log(`   Total unique brands: ${brandCounts.size}`);

  // Step 6: DB upsert (only if DATABASE_URL is set)
  if (process.env.DATABASE_URL) {
    console.log("\n6. Upserting to CertificationCache...");
    try {
      const count = await refreshNsfSportCache();
      console.log(`   ✓ Upserted ${count} products`);

      // Verify: check Thorne in DB
      console.log("\n7. Verifying DB lookups...");
      const thorneResult = await checkNsfSport(
        "Thorne® Amino Complex (Berry Flavored Amino Acids)",
        "Thorne"
      );
      console.log(`   checkNsfSport("Thorne® Amino Complex...") =`, thorneResult);
      if (thorneResult?.certified) {
        console.log("   ✓ Thorne certified=true from DB");
      } else {
        console.error("   ✗ FAIL: Thorne not certified in DB");
      }

      // Brand-only lookup
      const brandResult = await checkNsfSport("Some Unknown Product", "Thorne");
      console.log(`   checkNsfSport(unknown, "Thorne") =`, brandResult);
      if (brandResult?.certified) {
        console.log("   ✓ Thorne brand-only lookup returns certified=true");
      } else {
        console.error("   ✗ FAIL: Thorne brand-only lookup failed");
      }

      // Negative check: unknown brand
      const unknownResult = await checkNsfSport("Fake Supplement XYZ", "FakeBrand");
      console.log(`   checkNsfSport("FakeBrand") =`, unknownResult);
      if (unknownResult === null) {
        console.log("   ✓ Unknown brand returns null");
      } else {
        console.error("   ✗ FAIL: Unknown brand should return null");
      }
    } catch (err) {
      console.error("   ✗ DB error:", err);
    }
  } else {
    console.log("\n6. Skipping DB test (no DATABASE_URL set)");
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
