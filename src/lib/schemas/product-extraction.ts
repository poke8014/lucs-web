import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string(),
  amount: z.string().optional(),
  unit: z.string().optional(),
});

export const productExtractionSchema = z.object({
  name: z.string(),
  brand: z.string(),
  price: z.string().optional(),
  ingredients: z.array(ingredientSchema),
  claims: z.array(z.string()),
  certifications: z.array(z.string()),
  imageUrl: z.string().url().optional(),
});

export type Ingredient = z.infer<typeof ingredientSchema>;
export type ProductExtraction = z.infer<typeof productExtractionSchema>;
