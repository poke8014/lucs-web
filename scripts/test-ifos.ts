/**
 * Test script for IFOS certification module.
 *
 * Usage: npx tsx scripts/test-ifos.ts
 *
 * Tests:
 * 1. Nutrasource AJAX API connectivity (brands + products)
 * 2. Bulk fetch and cache refresh
 * 3. Known brand lookups (Nordic Naturals, Viva Naturals, Natural Factors)
 * 4. Product-level lookups
 * 5. Negative lookups (unknown brand)
 */
import "dotenv/config";

async function main() {
  const { refreshIfosCache, checkIfos } = await import(
    "../src/lib/certifications/ifos"
  );

  console.log("=== IFOS Certification Test ===\n");

  // Step 1: Quick API connectivity test
  console.log("1. Testing Nutrasource API connectivity...");
  const res = await fetch(
    "https://certifications.nutrasource.ca/umbraco/surface/NutrasourceContent/GetFilteredBrands?pageNumber=1&pageSize=1&byName=&forCertification=IFOS&forInterest=&forCategory=",
    { headers: { "X-Requested-With": "XMLHttpRequest" } },
  );
  if (!res.ok) {
    console.error(`   ✗ API returned ${res.status}`);
    process.exit(1);
  }
  const data = (await res.json()) as { totalCount: number };
  console.log(`   ✓ API reachable — ${data.totalCount} IFOS brands available\n`);

  // Step 2: Refresh cache
  if (!process.env.DATABASE_URL) {
    console.log("   ✗ DATABASE_URL not set — cannot test DB operations");
    process.exit(1);
  }

  console.log("2. Refreshing IFOS cache (bulk fetch + upsert)...");
  const count = await refreshIfosCache(true);
  console.log(`   ✓ Upserted ${count} cache entries\n`);

  // Step 3: Known brand lookups
  console.log("3. Testing known brand lookups...");
  const brandTests = [
    { product: "Some Fish Oil", brand: "Nordic Naturals", expectCert: true },
    { product: "Some Fish Oil", brand: "Viva Naturals", expectCert: true },
    { product: "Some Fish Oil", brand: "Natural Factors", expectCert: true },
    { product: "Some Fish Oil", brand: "AG1", expectCert: true },
  ];

  for (const t of brandTests) {
    const result = await checkIfos(t.product, t.brand);
    const pass = t.expectCert ? result?.certified === true : result === null;
    console.log(
      `   ${pass ? "✓" : "✗"} checkIfos("${t.product}", "${t.brand}") → ${
        result ? `certified=${result.certified}, certs=${result.certTypes?.join(",")}` : "null"
      }`,
    );
  }

  // Step 4: Product-level lookups
  console.log("\n4. Testing product name lookups...");
  const productTests = [
    "+Life Omega 3 Complete",
    "Baby's Nordic Flora Probiotic Powder",
  ];
  for (const name of productTests) {
    const result = await checkIfos(name, "Unknown");
    console.log(
      `   ${result ? "✓" : "✗"} checkIfos("${name}") → ${
        result
          ? `certified=${result.certified}, brand=${result.brand}, certs=${result.certTypes?.join(",")}`
          : "null"
      }`,
    );
  }

  // Step 5: Negative lookup
  console.log("\n5. Testing negative lookup...");
  const negResult = await checkIfos("Fake Supplement XYZ", "FakeBrand");
  console.log(
    `   ${negResult === null ? "✓" : "✗"} checkIfos("FakeBrand") → ${negResult ?? "null"}`,
  );

  // Step 6: Second call should use cache
  console.log("\n6. Testing cache hit (second refresh should skip)...");
  const count2 = await refreshIfosCache(false);
  console.log(
    `   ${count2 === 0 ? "✓" : "✗"} Second refresh returned ${count2} (expected 0 = cache hit)`,
  );

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
