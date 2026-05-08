/**
 * Test script for unified certification checker.
 *
 * Usage: npx tsx scripts/test-certifications.ts
 *
 * Tests:
 * 1. Check all sources for a known NSF Sport brand (Thorne)
 * 2. Check all sources for a known USP brand (Nature Made)
 * 3. Check with filtered sources (only nsf_sport)
 * 4. Negative lookup (unknown brand)
 * 5. Empty sources array skips all
 */
import "dotenv/config";

async function main() {
  const { checkCertifications } = await import(
    "../src/lib/certifications/index"
  );

  console.log("=== Unified Certification Checker Test ===\n");

  // Test 1: Thorne — should be NSF Sport certified
  console.log("1. Thorne (all sources)...");
  const thorne = await checkCertifications("Some Supplement", "Thorne");
  console.log(`   Checked: ${thorne.checked.join(", ")}`);
  console.log(`   Skipped: ${thorne.skipped.join(", ") || "(none)"}`);
  for (const r of thorne.results) {
    console.log(
      `   ✓ ${r.source}: certified=${r.certified}, brand=${r.brand}${r.certTypes ? `, types=${r.certTypes.join(",")}` : ""}`,
    );
  }
  if (thorne.results.length === 0) {
    console.log("   ✗ No certifications found (expected NSF Sport)");
  }

  // Test 2: Nature Made — should be USP Verified
  console.log("\n2. Nature Made (all sources)...");
  const natureMade = await checkCertifications(
    "Nature Made Vitamin D3",
    "Nature Made",
  );
  console.log(`   Checked: ${natureMade.checked.join(", ")}`);
  for (const r of natureMade.results) {
    console.log(
      `   ✓ ${r.source}: certified=${r.certified}, brand=${r.brand}`,
    );
  }
  if (natureMade.results.length === 0) {
    console.log("   ✗ No certifications found (expected USP Verified)");
  }

  // Test 3: Filtered sources — only NSF Sport
  console.log("\n3. Thorne (only nsf_sport)...");
  const thorneFiltered = await checkCertifications(
    "Some Supplement",
    "Thorne",
    ["nsf_sport"],
  );
  console.log(`   Checked: ${thorneFiltered.checked.join(", ")}`);
  console.log(`   Skipped: ${thorneFiltered.skipped.join(", ")}`);
  const nsfOnly =
    thorneFiltered.results.length > 0 &&
    thorneFiltered.results.every((r) => r.source === "nsf_sport");
  console.log(
    `   ${nsfOnly ? "✓" : "✗"} Only NSF Sport results returned`,
  );

  // Test 4: Negative lookup
  console.log("\n4. Unknown brand (all sources)...");
  const unknown = await checkCertifications(
    "Fake Supplement XYZ",
    "FakeBrand",
  );
  console.log(
    `   ${unknown.results.length === 0 ? "✓" : "✗"} No certifications found (${unknown.results.length} results)`,
  );

  // Test 5: Empty sources
  console.log("\n5. Empty sources array...");
  const empty = await checkCertifications("Anything", "Anyone", []);
  console.log(
    `   ${empty.checked.length === 0 ? "✓" : "✗"} Checked: ${empty.checked.length}, Skipped: ${empty.skipped.length}`,
  );

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
