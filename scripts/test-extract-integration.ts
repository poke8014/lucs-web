import "dotenv/config";
import { writeFileSync } from "fs";
import { join } from "path";
import { extractProduct } from "../src/lib/firecrawl";

const TEST_URLS = [
  "https://naturesbounty.com/products/magnesium-glycinate",
  "https://www.thorne.com/products/dp/magnesium-bisglycinate",
  "https://www.gardenoflife.com/vitamin-code-raw-d3",
  "https://www.nowfoods.com/products/supplements/ashwagandha-450-mg-veg-capsules",
  "https://jarrow.com/products/fem-dophilus-1-billion-cfu-veggie-caps",
];

interface TestResult {
  url: string;
  passed: boolean;
  errors: string[];
  data: Awaited<ReturnType<typeof extractProduct>> | null;
}

async function main() {
  const results: TestResult[] = [];

  for (const url of TEST_URLS) {
    console.log(`\n--- Testing: ${url} ---`);
    const result: TestResult = { url, passed: true, errors: [], data: null };

    try {
      const product = await extractProduct(url);
      result.data = product;

      // Assertions
      if (!product.name || product.name.length === 0) {
        result.errors.push("Name is empty");
      }
      if (!product.brand || product.brand.length === 0) {
        result.errors.push("Brand is empty");
      }
      if (!product.ingredients || product.ingredients.length < 1) {
        result.errors.push("No ingredients found (need at least 1)");
      }

      if (result.errors.length > 0) {
        result.passed = false;
      }

      console.log(`  Name:  ${product.name}`);
      console.log(`  Brand: ${product.brand}`);
      console.log(`  Ingredients: ${product.ingredients.length}`);
      console.log(`  Claims: ${product.claims.length}`);
      console.log(`  Result: ${result.passed ? "PASS" : "FAIL"}`);
      if (!result.passed) {
        console.log(`  Errors: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      result.passed = false;
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      console.log(`  Result: FAIL (exception)`);
      console.log(`  Error: ${result.errors[0]}`);
    }

    results.push(result);
  }

  // Save fixture
  const fixturePath = join(
    import.meta.dirname ?? __dirname,
    "..",
    "fixtures",
    "extraction-results.json",
  );
  const fixtureData = results.map((r) => ({
    url: r.url,
    extraction: r.data,
  }));
  writeFileSync(fixturePath, JSON.stringify(fixtureData, null, 2));
  console.log(`\nFixture saved to: ${fixturePath}`);

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n=== Summary: ${passed}/${results.length} passed, ${failed} failed ===`);

  if (failed > 0) {
    console.error("\nFailing URLs:");
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`  ${r.url}: ${r.errors.join(", ")}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
