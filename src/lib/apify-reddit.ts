import { z } from "zod";

const ACTOR_ID = "spry_wholemeal~reddit-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
// Synchronous wait — blocks until actor finishes (max 5 min)
const WAIT_FOR_FINISH_SECS = 300;

// Health-focused subreddits that yield the best signal for supplement/product reviews
const HEALTH_SUBREDDITS = [
  "Supplements",
  "Nootropics",
  "StackAdvice",
  "nutrition",
  "Fitness",
  "Biohackers",
  "vitamins",
];

// --- Zod schemas matching actual actor output (flat records) ---

const rawPostSchema = z.object({
  record_type: z.literal("post"),
  post_id: z.string(),
  subreddit: z.string().optional(),
  title: z.string(),
  text: z.string().optional().default(""),
  author: z.string(),
  score: z.number(),
  upvote_ratio: z.number().optional(),
  num_comments: z.number(),
  permalink: z.string(),
  engagement_level: z.string().optional(),
});

const rawCommentSchema = z.object({
  record_type: z.literal("comment"),
  comment_id: z.string(),
  post_id: z.string(),
  depth: z.number(),
  text: z.string(),
  author: z.string(),
  score: z.number(),
  is_submitter: z.boolean().optional(),
});

// Discriminated union for parsing raw actor output
const rawRecordSchema = z.discriminatedUnion("record_type", [
  rawPostSchema,
  rawCommentSchema,
]);

// --- Public types (post with grouped comments) ---

export const apifyRedditCommentSchema = z.object({
  commentId: z.string(),
  text: z.string(),
  author: z.string(),
  score: z.number(),
  depth: z.number(),
  isSubmitter: z.boolean(),
});

export const apifyRedditPostSchema = z.object({
  postId: z.string(),
  title: z.string(),
  text: z.string(),
  author: z.string(),
  score: z.number(),
  upvoteRatio: z.number().optional(),
  numComments: z.number(),
  permalink: z.string(),
  subreddit: z.string().optional(),
  engagementLevel: z.string().optional(),
  comments: z.array(apifyRedditCommentSchema),
});

export type ApifyRedditComment = z.infer<typeof apifyRedditCommentSchema>;
export type ApifyRedditPost = z.infer<typeof apifyRedditPostSchema>;

// --- Helpers ---

function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error("Missing APIFY_API_TOKEN environment variable");
  }
  return token;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Group flat actor records into posts with nested comments.
 */
function groupRecords(rawItems: unknown[]): ApifyRedditPost[] {
  const posts = new Map<string, ApifyRedditPost>();
  const comments: z.infer<typeof rawCommentSchema>[] = [];

  for (const item of rawItems) {
    const parsed = rawRecordSchema.safeParse(item);
    if (!parsed.success) {
      console.warn(
        "[scrapeRedditPosts] Skipping malformed record:",
        parsed.error.issues[0]?.message,
      );
      continue;
    }

    const record = parsed.data;
    if (record.record_type === "post") {
      posts.set(record.post_id, {
        postId: record.post_id,
        title: record.title,
        text: record.text,
        author: record.author,
        score: record.score,
        upvoteRatio: record.upvote_ratio,
        numComments: record.num_comments,
        permalink: record.permalink,
        subreddit: record.subreddit,
        engagementLevel: record.engagement_level,
        comments: [],
      });
    } else {
      comments.push(record);
    }
  }

  // Attach comments to their parent posts, sorted by score descending
  for (const comment of comments) {
    const post = posts.get(comment.post_id);
    if (post) {
      post.comments.push({
        commentId: comment.comment_id,
        text: comment.text,
        author: comment.author,
        score: comment.score,
        depth: comment.depth,
        isSubmitter: comment.is_submitter ?? false,
      });
    }
  }

  for (const post of posts.values()) {
    post.comments.sort((a, b) => b.score - a.score);
  }

  return Array.from(posts.values());
}

// --- Main function ---

/**
 * Scrape Reddit posts and comments for a product using the Apify Reddit Scraper actor.
 * Uses search mode to find posts mentioning the product across Reddit.
 * Comments are fetched only on high-engagement posts to control cost.
 */
export async function scrapeRedditPosts(
  productName: string,
  options?: { maxPostsPerQuery?: number; subreddits?: string[] },
): Promise<ApifyRedditPost[]> {
  const token = getApifyToken();
  const maxPostsPerQuery = options?.maxPostsPerQuery ?? 25;
  const subreddits = options?.subreddits ?? HEALTH_SUBREDDITS;

  // Build a subreddit-restricted query using Reddit search syntax
  const subredditFilter = subreddits
    .map((s) => `subreddit:${s}`)
    .join(" OR ");
  const query = `(${subredditFilter}) ${productName}`;

  const actorInput = {
    mode: "search",
    search: {
      queries: [query],
      sort: "relevance",
      maxPostsPerQuery,
      commentsMode: "high_engagement",
      commentsHighEngagementMinScore: 3,
      commentsHighEngagementMinComments: 3,
      commentsMaxTopLevel: 20,
      commentsMaxDepth: 2,
    },
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const runResponse = await fetch(
        `${APIFY_BASE_URL}/acts/${ACTOR_ID}/runs?waitForFinish=${WAIT_FOR_FINISH_SECS}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(actorInput),
        },
      );

      if (!runResponse.ok) {
        if (runResponse.status === 402) {
          throw new Error(
            `Apify payment required (402) — free tier limit likely exceeded`,
          );
        }
        if (isRetryable(runResponse.status)) {
          throw new RetryableError(
            `Apify API returned ${runResponse.status}`,
          );
        }
        const body = await runResponse.text();
        throw new Error(
          `Apify API error ${runResponse.status}: ${body}`,
        );
      }

      const runData = await runResponse.json();
      const run = runData.data;

      if (run.status !== "SUCCEEDED") {
        throw new Error(
          `Apify actor run failed: ${run.statusMessage ?? run.status}`,
        );
      }

      // Fetch results from the run's default dataset
      const datasetId = run.defaultDatasetId;
      const itemsResponse = await fetch(
        `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}`,
      );

      if (!itemsResponse.ok) {
        throw new Error(
          `Failed to fetch dataset items: ${itemsResponse.status}`,
        );
      }

      const rawItems: unknown[] = await itemsResponse.json();
      return groupRecords(rawItems);
    } catch (error) {
      lastError = error;

      const shouldRetry =
        error instanceof RetryableError ||
        (error instanceof TypeError && error.message.includes("fetch"));

      if (shouldRetry && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[scrapeRedditPosts] Attempt ${attempt}/${MAX_RETRIES} failed for "${productName}" — retrying in ${delay}ms`,
          error instanceof Error ? error.message : error,
        );
        await sleep(delay);
        continue;
      }

      console.error(
        `[scrapeRedditPosts] Failed for "${productName}" after ${attempt} attempt(s):`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  // Unreachable, but satisfies TypeScript
  throw lastError;
}

class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}
