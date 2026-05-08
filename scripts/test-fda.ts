/**
 * Test script for FDA adverse events module.
 *
 * Usage: npx tsx scripts/test-fda.ts
 *
 * Tests:
 * 1. Known supplement with many reports (Fish Oil)
 * 2. Known brand (Thorne)
 * 3. Product with verbose name (should normalize)
 * 4. Gibberish name (should return zero, no error)
 */
import "dotenv/config";
import { checkFDAAdverseEvents } from "../src/lib/fda";

async function main() {
  console.log("=== FDA Adverse Events Test ===\n");

  // Test 1: Well-known supplement
  console.log("1. Fish Oil (generic supplement name)...");
  const fishOil = await checkFDAAdverseEvents("Fish Oil", "Generic");
  console.log(`   Total reports:   ${fishOil.totalReports}`);
  console.log(`   Serious reports: ${fishOil.seriousReports}`);
  console.log(`   Has serious:     ${fishOil.hasSeriousEvents}`);
  console.log(`   Search term:     "${fishOil.searchTermUsed}"`);
  console.log(`   Top reactions:`);
  for (const r of fishOil.topReactions) {
    console.log(`     - ${r.term}: ${r.count}`);
  }
  const pass1 = fishOil.totalReports > 0 && fishOil.topReactions.length > 0;
  console.log(`   ${pass1 ? "✓" : "✗"} Has reports and reactions\n`);

  // Test 2: Known brand name
  console.log("2. Magnesium Bisglycinate by Thorne...");
  const thorne = await checkFDAAdverseEvents(
    "Magnesium Bisglycinate",
    "Thorne",
  );
  console.log(`   Total reports:   ${thorne.totalReports}`);
  console.log(`   Serious reports: ${thorne.seriousReports}`);
  console.log(`   Search term:     "${thorne.searchTermUsed}"`);
  console.log(`   Top reactions:`);
  for (const r of thorne.topReactions) {
    console.log(`     - ${r.term}: ${r.count}`);
  }
  console.log(`   ✓ Completed without error\n`);

  // Test 3: Verbose product name (normalization test)
  console.log("3. Verbose name normalization...");
  const verbose = await checkFDAAdverseEvents(
    "Kirkland Signature Krill Oil 500 mg 160 Softgels",
    "Kirkland",
  );
  console.log(`   Search term:     "${verbose.searchTermUsed}"`);
  console.log(`   Total reports:   ${verbose.totalReports}`);
  const pass3 = !verbose.searchTermUsed.includes("500");
  console.log(
    `   ${pass3 ? "✓" : "✗"} Dosage stripped from search term\n`,
  );

  // Test 4: Gibberish name (zero results, no crash)
  console.log("4. Gibberish name (should return zero)...");
  const gibberish = await checkFDAAdverseEvents(
    "Xyzzywumpus Florbotanix 9000",
    "FakeBrandXYZ",
  );
  const pass4 =
    gibberish.totalReports === 0 &&
    gibberish.seriousReports === 0 &&
    gibberish.topReactions.length === 0;
  console.log(`   Total reports: ${gibberish.totalReports}`);
  console.log(`   ${pass4 ? "✓" : "✗"} Zero results, no error\n`);

  // Test 5: Vitamin D (high volume supplement)
  console.log("5. Vitamin D (high volume)...");
  const vitD = await checkFDAAdverseEvents("Vitamin D", "Nature Made");
  console.log(`   Total reports:   ${vitD.totalReports}`);
  console.log(`   Serious reports: ${vitD.seriousReports}`);
  console.log(`   Search term:     "${vitD.searchTermUsed}"`);
  console.log(`   Top reactions:`);
  for (const r of vitD.topReactions) {
    console.log(`     - ${r.term}: ${r.count}`);
  }
  const pass5 = vitD.totalReports > 0;
  console.log(`   ${pass5 ? "✓" : "✗"} Has reports\n`);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
