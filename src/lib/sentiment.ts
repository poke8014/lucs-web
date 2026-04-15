import { getGeminiClient } from "./gemini";
import {
  sentimentResultSchema,
  type SentimentResult,
} from "./schemas/sentiment-result";
import type { ApifyRedditPost, ApifyRedditComment } from "./apify-reddit";

const MODEL_NAME = "gemini-2.5-flash";
const MAX_PROMPT_CHARS = 8000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

// Keywords that signal a comment contains product experience info
const SIGNAL_KEYWORDS = [
  // Efficacy
  "works", "worked", "effective", "helped", "noticed", "improvement",
  "difference", "better", "worse", "no effect", "didn't work", "useless",
  // Dosage / usage
  "dose", "dosage", "taking", "taken", "mg", "capsule", "tablet",
  "morning", "night", "daily", "weeks", "months",
  // Side effects
  "side effect", "stomach", "nausea", "headache", "sleep", "energy",
  "anxiety", "digestion", "absorption",
  // Quality / trust
  "third party", "tested", "lab", "certificate", "coa", "nsf", "usp",
  "quality", "purity", "bioavailable", "chelated", "form",
  // Comparison
  "switched", "compared", "vs", "alternative", "brand", "recommend",
  // Negative trust signals
  "shill", "sponsored", "marketing", "placebo",
];

const SYSTEM_PROMPT = `You are a clinical product sentiment analyst. Analyze Reddit discussions about a health/supplement product and return a structured JSON sentiment analysis.

IMPORTANT DISTINCTIONS:
- Efficacy reports ("this actually helped my sleep", "noticed improvement after 2 weeks") are high-signal
- Hype/excitement ("just ordered, excited!", "heard great things") is low-signal
- Negative experiences ("gave me stomach issues", "no effect after 3 months") are high-signal
- Marketing language or suspected shilling should be flagged

Return ONLY valid JSON matching this schema:
{
  "overallScore": <number 1-10, where 1=very negative, 10=very positive>,
  "totalMentions": <number of unique posts/comments analyzed>,
  "themes": [
    { "label": "<theme description>", "sentiment": "positive"|"negative"|"neutral", "mentionCount": <number> }
  ],
  "representativeQuotes": [
    { "text": "<exact quote>", "source": "<reddit permalink or subreddit/author>", "sentiment": "positive"|"negative"|"neutral" }
  ],
  "confidenceLevel": "low"|"medium"|"high"
}

CONFIDENCE GUIDELINES:
- "low": fewer than 3 posts with substantive discussion
- "medium": 3-7 posts with some efficacy reports
- "high": 8+ posts with detailed user experiences

Extract 2-5 representative quotes that best capture the range of user experiences. Include the Reddit permalink as the source.`;

/** Max comments per post sent to the LLM / displayed to the user. */
const COMMENTS_PER_POST = 5;
/** Minimum relevance score for a comment to be considered. */
const MIN_RELEVANCE_SCORE = 2;

/**
 * Score a comment for relevance to a product analysis.
 * Higher score = more useful for sentiment analysis.
 */
function scoreComment(
  comment: ApifyRedditComment,
  productName: string,
): number {
  let score = 0;
  const textLower = comment.text.toLowerCase();
  const productLower = productName.toLowerCase();

  // Upvotes: strongest community signal
  if (comment.score >= 10) score += 3;
  else if (comment.score >= 5) score += 2;
  else if (comment.score >= 2) score += 1;

  // Product name mention
  if (textLower.includes(productLower)) score += 3;
  // Check individual words of product name (e.g. "magnesium" from "Thorne Magnesium Bisglycinate")
  for (const word of productLower.split(/\s+/)) {
    if (word.length >= 4 && textLower.includes(word)) {
      score += 1;
      break; // only count once
    }
  }

  // Keyword matches — cap contribution at 3
  let keywordHits = 0;
  for (const kw of SIGNAL_KEYWORDS) {
    if (textLower.includes(kw)) {
      keywordHits++;
      if (keywordHits >= 3) break;
    }
  }
  score += keywordHits;

  // OP responding in their own thread often provides follow-up experience
  if (comment.isSubmitter) score += 1;

  // Penalize very short comments (likely low effort)
  if (comment.text.length < 30) score -= 2;
  // Bonus for substantive comments
  if (comment.text.length > 100) score += 1;

  return score;
}

/**
 * Filter a post's comments to only those relevant for sentiment analysis.
 * Returns the post with filtered, scored, and sorted comments.
 * Returns null if no relevant comments remain and the post itself
 * doesn't mention the product.
 */
export function filterPostComments(
  post: ApifyRedditPost,
  productName: string,
): ApifyRedditPost | null {
  const scored = post.comments
    .map((c) => ({ comment: c, relevance: scoreComment(c, productName) }))
    .filter((s) => s.relevance >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, COMMENTS_PER_POST);

  // If no relevant comments and post title doesn't mention product, skip
  if (scored.length === 0) {
    const titleLower = post.title.toLowerCase();
    const productLower = productName.toLowerCase();
    const hasProductInTitle =
      titleLower.includes(productLower) ||
      productLower.split(/\s+/).some((w) => w.length >= 4 && titleLower.includes(w));
    if (!hasProductInTitle) return null;
  }

  return { ...post, comments: scored.map((s) => s.comment) };
}

/**
 * Filter all posts down to those with relevant comments, respecting
 * the character budget for the Gemini prompt. This is the exact data
 * Gemini sees and the frontend displays.
 */
export function filterPostsForDigest(
  posts: ApifyRedditPost[],
  productName: string,
): ApifyRedditPost[] {
  const headerChars = 40;
  let totalChars = headerChars;
  const filtered: ApifyRedditPost[] = [];

  for (const post of posts) {
    const relevant = filterPostComments(post, productName);
    if (!relevant) continue;

    let blockLen =
      relevant.title.length + 80 +
      (relevant.permalink.length + 30) +
      (relevant.text ? Math.min(relevant.text.length, 500) + 10 : 0);

    for (const c of relevant.comments) {
      blockLen += Math.min(c.text.length, 300) + 40;
    }

    if (totalChars + blockLen > MAX_PROMPT_CHARS) break;

    filtered.push(relevant);
    totalChars += blockLen;
  }

  return filtered;
}

/**
 * Build a text digest from Apify Reddit posts for the Gemini prompt.
 * Prioritizes: post title (full), post text (capped), top comments by score.
 */
function buildRedditDigest(
  productName: string,
  posts: ApifyRedditPost[],
): string {
  const lines: string[] = [
    `Product: ${productName}`,
    `Total posts found: ${posts.length}`,
    "",
  ];

  let totalChars = lines.join("\n").length;

  for (const post of posts) {
    const postHeader = `--- Post: "${post.title}" (score: ${post.score}, comments: ${post.numComments}) ---`;
    const postText = post.text
      ? `Text: ${post.text.slice(0, 500)}`
      : "";
    const permalink = `Link: https://reddit.com${post.permalink}`;

    const postBlock = [postHeader, permalink, postText].filter(Boolean);

    // Comments are already sorted by score descending from apify-reddit.ts
    for (const comment of post.comments.slice(0, 5)) {
      postBlock.push(
        `  Comment (score ${comment.score}, by ${comment.author}): ${comment.text.slice(0, 300)}`,
      );
    }

    const blockText = postBlock.join("\n") + "\n";

    if (totalChars + blockText.length > MAX_PROMPT_CHARS) {
      break;
    }

    lines.push(blockText);
    totalChars += blockText.length;
  }

  return lines.join("\n");
}

/**
 * Analyze Reddit posts/comments about a product using Gemini to produce
 * a structured sentiment result.
 */
export async function analyzeRedditSentiment(
  productName: string,
  posts: ApifyRedditPost[],
): Promise<SentimentResult> {
  if (posts.length === 0) {
    return {
      overallScore: 5,
      totalMentions: 0,
      themes: [],
      representativeQuotes: [],
      confidenceLevel: "low",
    };
  }

  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const digest = buildRedditDigest(productName, posts);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nAnalyze the following Reddit discussions about "${productName}":\n\n${digest}`,
              },
            ],
          },
        ],
      });

      const responseText = result.response.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Gemini returned invalid JSON for sentiment analysis: ${responseText.slice(0, 200)}`,
        );
      }

      return sentimentResultSchema.parse(parsed);
    } catch (error) {
      lastError = error;

      const isRetryable =
        error instanceof Error &&
        (/503|429|overloaded|high demand/i.test(error.message) ||
          error.message.includes("fetch"));

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[analyzeRedditSentiment] Attempt ${attempt}/${MAX_RETRIES} failed — retrying in ${delay}ms`,
          error.message,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
