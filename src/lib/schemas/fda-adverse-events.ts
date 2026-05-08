import { z } from "zod";

export const fdaReactionSchema = z.object({
  term: z.string(),
  count: z.number().int().nonnegative(),
});

export const fdaAdverseEventsResultSchema = z.object({
  totalReports: z.number().int().nonnegative(),
  seriousReports: z.number().int().nonnegative(),
  hasSeriousEvents: z.boolean(),
  topReactions: z.array(fdaReactionSchema).max(5),
  searchTermUsed: z.string(),
});

export type FDAReaction = z.infer<typeof fdaReactionSchema>;
export type FDAAdverseEventsResult = z.infer<typeof fdaAdverseEventsResultSchema>;
