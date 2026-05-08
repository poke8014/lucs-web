import FirecrawlApp from "@mendable/firecrawl-js";
import "dotenv/config";

const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  console.error("Missing FIRECRAWL_API_KEY in .env");
  process.exit(1);
}

const app = new FirecrawlApp({ apiKey });

async function main() {
  console.log("Scraping https://example.com ...\n");

  const result = await app.v1.scrapeUrl("https://example.com", {
    formats: ["markdown"],
  });

  if (!result.success) {
    console.error("Scrape failed:", result.error);
    process.exit(1);
  }

  console.log("=== Scraped Markdown Content ===\n");
  console.log(result.markdown);
  console.log("\n=== Metadata ===\n");
  console.log(JSON.stringify(result.metadata, null, 2));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
