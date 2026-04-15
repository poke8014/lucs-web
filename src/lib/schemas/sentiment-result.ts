import { z } from "zod";

export const themeSchema = z.object({
  label: z.string(),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  mentionCount: z.number().int().nonnegative(),
});

export const representativeQuoteSchema = z.object({
  text: z.string(),
  source: z.string(),
  sentiment: z.enum(["positive", "negative", "neutral"]),
});

export const sentimentResultSchema = z.object({
  overallScore: z.number().min(1).max(10),
  totalMentions: z.number().int().nonnegative(),
  themes: z.array(themeSchema),
  representativeQuotes: z.array(representativeQuoteSchema),
  confidenceLevel: z.enum(["low", "medium", "high"]),
});

export type Theme = z.infer<typeof themeSchema>;
export type RepresentativeQuote = z.infer<typeof representativeQuoteSchema>;
export type SentimentResult = z.infer<typeof sentimentResultSchema>;
