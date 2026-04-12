import { NextResponse } from "next/server";
import { z } from "zod";
import { extractProduct } from "@/src/lib/firecrawl";
import { prisma } from "@/src/lib/prisma";

const analyzeSchema = z.object({
  urls: z
    .array(z.string().url("Each URL must be a valid URL"))
    .min(1, "At least one URL is required"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const result = analyzeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const products = [];
  for (const url of result.data.urls) {
    try {
      const extraction = await extractProduct(url);

      const product = await prisma.product.create({
        data: {
          url,
          name: extraction.name,
          brand: extraction.brand,
          price: extraction.price,
          ingredients: extraction.ingredients,
          rawClaims: extraction.claims,
          certifications: extraction.certifications,
          imageUrl: extraction.imageUrl,
        },
      });

      products.push({ ...product, extraction });
    } catch (error) {
      products.push({
        url,
        error: error instanceof Error ? error.message : "Extraction failed",
      });
    }
  }

  return NextResponse.json({ products });
}
