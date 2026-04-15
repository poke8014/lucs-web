"use client";

import { useState } from "react";

type PipelineStage =
  | "extracting"
  | "scraping-reddit"
  | "filtering-comments"
  | "analyzing-sentiment"
  | "done";

const STAGE_LABELS: Record<PipelineStage, string> = {
  extracting: "Scraping product page…",
  "scraping-reddit": "Searching Reddit…",
  "filtering-comments": "Filtering relevant comments…",
  "analyzing-sentiment": "Analyzing sentiment…",
  done: "Done",
};

const STAGE_ORDER: PipelineStage[] = [
  "extracting",
  "scraping-reddit",
  "filtering-comments",
  "analyzing-sentiment",
];

interface UrlInputProps {
  onAnalyze: (url: string) => Promise<void>;
  isLoading: boolean;
  stage: PipelineStage | null;
}

export default function UrlInput({
  onAnalyze,
  isLoading,
  stage,
}: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function validate(value: string): string | null {
    if (!value.trim()) return "URL is required";
    try {
      const parsed = new URL(value.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "URL must start with http:// or https://";
      }
      return null;
    } catch {
      return "Enter a valid URL";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    onAnalyze(url.trim());
  }

  const stageIndex = stage ? STAGE_ORDER.indexOf(stage) : -1;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            placeholder="https://example.com/product-page"
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500"
          />
          {error && (
            <p className="mt-1.5 text-sm text-red-600">{error}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="shrink-0 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {isLoading && stage && stage !== "done" && (
        <div className="mt-4 flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <div className="text-sm text-gray-600">
            {STAGE_LABELS[stage]}
          </div>
          <div className="ml-auto flex gap-1">
            {STAGE_ORDER.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i <= stageIndex ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
