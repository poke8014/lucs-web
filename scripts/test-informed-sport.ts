/**
 * Test script for Informed Sport certification module.
 *
 * Usage: npx tsx scripts/test-informed-sport.ts
 *
 * Tests:
 * 1. Firecrawl scrape of Informed Sport directory
 * 2. Brand list parsing (count, known brands)
 * 3. Product card parsing (count, structure)
 * 4. DB upsert into CertificationCache
 * 5. DB lookup queries (brand match, negative check)
 */
import "dotenv/config";

async function main() {
  const {
    parseBrands,
    parseProducts,
    normalizeBrand,
    toLookupKey,
    refreshInformedSportCache,
    checkInformedSport,
  } = await import("../src/lib/certifications/informed-sport");
  const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;

  console.log("=== Informed Sport Certification Test ===\n");

  // Step 1: Scrape the directory page
  console.log("1. Scraping Informed Sport directory...");
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error("   ✗ FIRECRAWL_API_KEY not set — cannot proceed");
    process.exit(1);
  }

  const client = new FirecrawlApp({ apiKey });
  const result = await client.v1.scrapeUrl(
    "https://sport.wetestyoutrust.com/supplement-search",
    { formats: ["markdown"], waitFor: 5000 }
  );

  if (!result.success || !result.markdown) {
    console.error("   ✗ FAIL: Firecrawl scrape failed");
    process.exit(1);
  }
  console.log(`   Scraped ${result.markdown.length} chars of markdown`);
  console.log("   ✓ Scrape OK\n");

  // Step 2: Parse brands
  console.log("2. Parsing brands from sidebar...");
  const brands = parseBrands(result.markdown);
  console.log(`   Found ${brands.length} brands`);

  if (brands.length === 0) {
    console.error("   ✗ FAIL: Zero brands parsed!");
    process.exit(1);
  }
  if (brands.length < 400) {
    console.warn(`   ⚠ WARNING: Only ${brands.length} brands (expected 500+)`);
  }

  // Check known brands
  console.log("\n   Known brand checks:");
  const knownBrands = ["Momentous", "Optimum Nutrition", "AG1", "Huel", "Myprotein", "Onnit"];
  for (const brandName of knownBrands) {
    const found = brands.find((b) => b.toLowerCase().includes(brandName.toLowerCase()));
    console.log(`   ${found ? "✓" : "✗"} ${brandName}: ${found || "NOT FOUND"}`);
  }

  // Confirm Thorne is NOT in Informed Sport (it's NSF Sport only)
  const thorneFound = brands.find((b) => b.toLowerCase().includes("thorne"));
  console.log(`   ${!thorneFound ? "✓" : "⚠"} Thorne NOT in Informed Sport: ${thorneFound || "correct"}`);

  // Step 3: Parse products
  console.log("\n3. Parsing product cards...");
  const products = parseProducts(result.markdown);
  console.log(`   Found ${products.length} products on page 0`);

  if (products.length > 0) {
    console.log("   Sample products:");
    for (const p of products.slice(0, 5)) {
      console.log(`     - "${p.productName}" by "${p.brand}"`);
    }
  } else {
    console.warn("   ⚠ No products parsed from cards (brand sidebar is still available)");
  }

  // Step 4: Test helpers
  console.log("\n4. Testing helpers...");
  console.log(`   toLookupKey("Optimum Nutrition") = "${toLookupKey("Optimum Nutrition")}"`);
  console.log(`   toLookupKey("AG1 (EU)") = "${toLookupKey("AG1 (EU)")}"`);
  console.log(`   normalizeBrand("Herbalife Nutrition LLC") = "${normalizeBrand("Herbalife Nutrition LLC")}"`);

  // Step 5: DB operations
  if (process.env.DATABASE_URL) {
    console.log("\n5. Refreshing CertificationCache...");
    try {
      const count = await refreshInformedSportCache();
      console.log(`   ✓ Upserted ${count} entries`);

      // Step 6: Verify DB lookups
      console.log("\n6. Verifying DB lookups...");

      // Brand lookup: Momentous (known Informed Sport brand)
      const momentousResult = await checkInformedSport("Some Unknown Product", "Momentous");
      console.log(`   checkInformedSport(unknown, "Momentous") =`, momentousResult);
      if (momentousResult?.certified) {
        console.log("   ✓ Momentous brand lookup returns certified=true");
      } else {
        console.error("   ✗ FAIL: Momentous brand lookup failed");
      }

      // Brand lookup: AG1
      const ag1Result = await checkInformedSport("AG1", "AG1");
      console.log(`   checkInformedSport("AG1", "AG1") =`, ag1Result);
      if (ag1Result?.certified) {
        console.log("   ✓ AG1 returns certified=true");
      } else {
        console.error("   ✗ FAIL: AG1 lookup failed");
      }

      // Negative check: unknown brand
      const unknownResult = await checkInformedSport("Fake Supplement XYZ", "FakeBrand");
      console.log(`   checkInformedSport("FakeBrand") =`, unknownResult);
      if (unknownResult === null) {
        console.log("   ✓ Unknown brand returns null");
      } else {
        console.error("   ✗ FAIL: Unknown brand should return null");
      }

      // Negative check: Thorne (NSF Sport, not Informed Sport)
      const thorneResult = await checkInformedSport("Thorne Amino Complex", "Thorne");
      console.log(`   checkInformedSport("Thorne") =`, thorneResult);
      if (thorneResult === null) {
        console.log("   ✓ Thorne returns null (not in Informed Sport)");
      } else {
        console.warn("   ⚠ Thorne matched — might be a fuzzy match");
      }
    } catch (err) {
      console.error("   ✗ DB error:", err);
    }
  } else {
    console.log("\n5. Skipping DB test (no DATABASE_URL set)");
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
