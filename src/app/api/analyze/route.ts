import { NextResponse } from "next/server";
import { z } from "zod";
import { extractProduct } from "@/src/lib/firecrawl";
import { scrapeRedditPosts } from "@/src/lib/apify-reddit";
import { analyzeRedditSentiment, filterPostComments, filterPostsForDigest } from "@/src/lib/sentiment";
import { prisma } from "@/src/lib/prisma";
import type { ApifyRedditPost } from "@/src/lib/apify-reddit";

const analyzeSchema = z.object({
  urls: z
    .array(z.string().url("Each URL must be a valid URL"))
    .min(1, "At least one URL is required"),
});

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

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

  const url = result.data.urls[0];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(new TextEncoder().encode(sseEvent(event, data)));
      };

      try {
        // Stage 1: Product extraction
        const extraction = await extractProduct(url);
        send("extraction", extraction);

        // Stage 2: Reddit scraping — stream filtered posts individually
        const filteredPosts: ApifyRedditPost[] = [];
        let rawPostCount = 0;
        let rawCommentCount = 0;
        try {
          const rawPosts = await scrapeRedditPosts(extraction.name);
          rawPostCount = rawPosts.length;
          rawCommentCount = rawPosts.reduce(
            (n, p) => n + p.comments.length,
            0,
          );

          // Filter and stream each post individually so the UI updates incrementally
          for (const post of rawPosts) {
            const filtered = filterPostComments(post, extraction.name);
            if (filtered) {
              filteredPosts.push(filtered);
              send("reddit-post", filtered);
            }
          }

          send("reddit-complete", {
            totalPosts: filteredPosts.length,
            totalComments: filteredPosts.reduce(
              (n, p) => n + p.comments.length,
              0,
            ),
            rawPostCount,
            rawCommentCount,
          });
        } catch (redditError) {
          const detail =
            redditError instanceof Error
              ? redditError.message
              : String(redditError);
          console.warn(
            `[analyze] Reddit scraping failed for "${extraction.name}":`,
            detail,
          );
          send("reddit-error", {
            message: `Reddit scraping failed: ${detail}`,
          });
        }

        // Stage 3: Sentiment analysis on filtered posts
        let redditSentiment = null;
        if (filteredPosts.length > 0) {
          try {
            // Budget-constrained subset for the Gemini prompt
            const digestPosts = filterPostsForDigest(
              filteredPosts,
              extraction.name,
            );
            redditSentiment = await analyzeRedditSentiment(
              extraction.name,
              digestPosts,
            );
            send("sentiment", redditSentiment);
          } catch (sentimentError) {
            const detail =
              sentimentError instanceof Error
                ? sentimentError.message
                : String(sentimentError);
            console.warn(
              `[analyze] Sentiment analysis failed for "${extraction.name}":`,
              detail,
            );
            send("sentiment-error", {
              message: `Gemini sentiment analysis failed: ${detail}`,
            });
          }
        } else if (rawPostCount === 0) {
          send("sentiment-error", {
            message: `No Reddit discussions found for "${extraction.name}" in health-focused subreddits (r/Supplements, r/Nootropics, r/StackAdvice, r/nutrition, r/Fitness, r/Biohackers, r/vitamins)`,
          });
        } else {
          send("sentiment-error", {
            message: `Found ${rawPostCount} Reddit post${rawPostCount !== 1 ? "s" : ""} with ${rawCommentCount} comment${rawCommentCount !== 1 ? "s" : ""}, but none contained relevant product experience discussion after filtering. Try a more specific or well-known product name`,
          });
        }

        // Persist to database
        await prisma.product.create({
          data: {
            url,
            name: extraction.name,
            brand: extraction.brand,
            price: extraction.price,
            ingredients: extraction.ingredients,
            rawClaims: extraction.claims,
            certifications: extraction.certifications,
            imageUrl: extraction.imageUrl,
            redditSentiment: redditSentiment ?? undefined,
          },
        });

        send("done", { success: true });
      } catch (error) {
        send("error", {
          message:
            error instanceof Error ? error.message : "Analysis failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
