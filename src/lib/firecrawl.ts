import FirecrawlApp, { SdkError } from "@mendable/firecrawl-js";
import {
  productExtractionSchema,
  type ProductExtraction,
} from "./schemas/product-extraction";

// JSON Schema passed to Firecrawl's LLM extraction (avoids Zod 3/4 type mismatch)
const productJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    brand: { type: "string" },
    price: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          amount: { type: "string" },
          unit: { type: "string" },
        },
        required: ["name"],
      },
    },
    claims: { type: "array", items: { type: "string" } },
    certifications: { type: "array", items: { type: "string" } },
    imageUrl: { type: "string" },
  },
  required: ["name", "brand", "ingredients", "claims", "certifications"],
} as const;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function getFirecrawlClient() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("Missing FIRECRAWL_API_KEY environment variable");
  }
  return new FirecrawlApp({ apiKey });
}

function isRetryable(error: unknown): boolean {
  if (error instanceof SdkError && error.status != null) {
    return error.status === 429 || error.status >= 500;
  }
  // Network errors (fetch failures, timeouts, etc.)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function extractProduct(url: string): Promise<ProductExtraction> {
  const client = getFirecrawlClient();

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await client.v1.scrapeUrl(url, {
        formats: ["extract"],
        extract: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          schema: productJsonSchema as any,
          prompt:
            "Extract the product information from this supplement/health product page. " +
            "Include the product name, brand, price (if visible), all ingredients with amounts and units, " +
            "any health claims or benefits stated, certifications (e.g. GMP, NSF, Non-GMO), " +
            "and the main product image URL.",
        },
      });

      if (!result.success) {
        throw new Error(
          `Firecrawl scrape failed for ${url}: ${result.error}`,
        );
      }

      const extracted = result.extract;
      if (!extracted) {
        throw new Error(`No extraction data returned for ${url}`);
      }

      return productExtractionSchema.parse(extracted);
    } catch (error) {
      lastError = error;

      if (isRetryable(error) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[extractProduct] Attempt ${attempt}/${MAX_RETRIES} failed for ${url} — retrying in ${delay}ms`,
          error instanceof Error ? error.message : error,
        );
        await sleep(delay);
        continue;
      }

      // Non-retryable or final attempt — log and throw
      console.error(
        `[extractProduct] Failed for ${url} after ${attempt} attempt(s):`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  // Unreachable, but satisfies TypeScript
  throw lastError;
}
