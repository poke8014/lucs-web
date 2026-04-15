"use client";

import { useState, useCallback } from "react";
import UrlInput from "./_components/UrlInput";
import ProductCard from "./_components/ProductCard";
import SentimentPanel from "./_components/SentimentPanel";
import RedditMentions from "./_components/RedditMentions";
import type { ProductExtraction } from "@/src/lib/schemas/product-extraction";
import type { SentimentResult } from "@/src/lib/schemas/sentiment-result";
import type { ApifyRedditPost } from "@/src/lib/apify-reddit";

type PipelineStage =
  | "extracting"
  | "scraping-reddit"
  | "filtering-comments"
  | "analyzing-sentiment"
  | "done";

export default function ScrapaholicPage() {
  const [extraction, setExtraction] = useState<ProductExtraction | null>(null);
  const [redditPosts, setRedditPosts] = useState<ApifyRedditPost[]>([]);
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = useCallback(async (url: string) => {
    setIsLoading(true);
    setError("");
    setExtraction(null);
    setRedditPosts([]);
    setSentiment(null);
    setStage("extracting");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error
            ? typeof body.error === "string"
              ? body.error
              : JSON.stringify(body.error)
            : `Analysis failed (${response.status})`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are delimited by double newlines — only process complete ones
        const messages = buffer.split("\n\n");
        // Last element may be incomplete; keep it in the buffer
        buffer = messages.pop() ?? "";

        for (const message of messages) {
          if (!message.trim()) continue;

          let currentEvent = "";
          let dataLine = "";

          for (const line of message.split("\n")) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ")) {
              dataLine = line.slice(6);
            }
          }

          if (!currentEvent || !dataLine) continue;

          const data = JSON.parse(dataLine);

          switch (currentEvent) {
            case "extraction":
              setExtraction(data);
              setStage("scraping-reddit");
              break;
            case "reddit-post":
              // Posts arrive one at a time — accumulate them
              setRedditPosts((prev) => [...prev, data]);
              setStage("filtering-comments");
              break;
            case "reddit-complete":
              setStage("analyzing-sentiment");
              break;
            case "reddit-error":
              setStage("analyzing-sentiment");
              break;
            case "sentiment":
              setSentiment(data);
              break;
            case "sentiment-error":
              // Sentiment failed — raw reddit data is still visible
              break;
            case "error":
              throw new Error(data.message);
            case "done":
              break;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStage("done");
      setIsLoading(false);
    }
  }, []);

  const hasResults = extraction || redditPosts.length > 0 || sentiment;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Scrapaholic
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Paste a supplement product URL to see extracted claims and real user sentiment
        </p>
      </div>

      <div className="mt-8">
        <UrlInput
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          stage={stage}
        />
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasResults && (
        <div className="mt-8 space-y-6">
          {extraction && <ProductCard extraction={extraction} />}

          {redditPosts.length > 0 && (
            <RedditMentions
              posts={redditPosts}
              isStreaming={stage === "filtering-comments"}
            />
          )}

          {sentiment ? (
            <SentimentPanel sentiment={sentiment} />
          ) : (
            extraction &&
            stage === "done" && (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reddit Sentiment
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  Sentiment data unavailable for this product
                </p>
              </div>
            )
          )}
        </div>
      )}

      {!hasResults && !isLoading && !error && (
        <div className="mt-16 text-center text-sm text-gray-400">
          Enter a product URL above to get started
        </div>
      )}
    </main>
  );
}
