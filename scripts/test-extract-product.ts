import "dotenv/config";
import { extractProduct } from "../src/lib/firecrawl";

const TEST_URL =
  "https://naturesbounty.com/products/magnesium-glycinate";

async function main() {
  console.log(`Extracting product from: ${TEST_URL}\n`);

  const product = await extractProduct(TEST_URL);

  console.log("=== Extraction Result ===\n");
  console.log(`Name:  ${product.name}`);
  console.log(`Brand: ${product.brand}`);
  console.log(`Price: ${product.price ?? "(not found)"}`);
  console.log(`Image: ${product.imageUrl ?? "(not found)"}`);
  console.log(`\nIngredients (${product.ingredients.length}):`);
  for (const ing of product.ingredients) {
    const amt = ing.amount ? ` — ${ing.amount}${ing.unit ?? ""}` : "";
    console.log(`  • ${ing.name}${amt}`);
  }
  console.log(`\nClaims (${product.claims.length}):`);
  for (const claim of product.claims) {
    console.log(`  • ${claim}`);
  }
  console.log(`\nCertifications (${product.certifications.length}):`);
  for (const cert of product.certifications) {
    console.log(`  • ${cert}`);
  }

  // Verification checks
  console.log("\n=== Verification ===");
  const checks = [
    { label: "Name populated", pass: product.name.length > 0 },
    { label: "Brand populated", pass: product.brand.length > 0 },
    {
      label: "3+ ingredients",
      pass: product.ingredients.length >= 3,
    },
  ];
  for (const check of checks) {
    console.log(`${check.pass ? "✓" : "✗"} ${check.label}`);
  }

  const allPassed = checks.every((c) => c.pass);
  if (!allPassed) {
    console.error("\nSome verification checks failed.");
    process.exit(1);
  }
  console.log("\nAll checks passed!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
