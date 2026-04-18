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

export const CERT_SOURCES = [
  { id: "nsf_sport", label: "NSF Sport" },
  { id: "informed_sport", label: "Informed Sport" },
  { id: "usp_verified", label: "USP Verified" },
  { id: "ifos", label: "IFOS" },
  { id: "bscg", label: "BSCG" },
] as const;

export type CertSourceId = (typeof CERT_SOURCES)[number]["id"];

export const ALL_CERT_SOURCE_IDS: CertSourceId[] = CERT_SOURCES.map((s) => s.id);

interface UrlInputProps {
  onAnalyze: (url: string, certSources: CertSourceId[]) => Promise<void>;
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
  const [certSources, setCertSources] = useState<CertSourceId[]>([...ALL_CERT_SOURCE_IDS]);

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
    onAnalyze(url.trim(), certSources);
  }

  function toggleCertSource(id: CertSourceId) {
    setCertSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    setCertSources((prev) =>
      prev.length === CERT_SOURCES.length ? [] : [...ALL_CERT_SOURCE_IDS],
    );
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

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            Certification sources
          </span>
          <button
            type="button"
            onClick={toggleAll}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {certSources.length === CERT_SOURCES.length
              ? "Deselect all"
              : "Select all"}
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {CERT_SOURCES.map((source) => {
            const checked = certSources.includes(source.id);
            return (
              <label
                key={source.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  checked
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-gray-50 text-gray-400"
                } ${isLoading ? "cursor-not-allowed opacity-60" : "hover:border-blue-300"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCertSource(source.id)}
                  disabled={isLoading}
                  className="sr-only"
                />
                <span
                  className={`inline-block h-3 w-3 rounded border ${
                    checked
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {checked && (
                    <svg
                      viewBox="0 0 12 12"
                      className="h-3 w-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M2.5 6l2.5 2.5 4.5-5" />
                    </svg>
                  )}
                </span>
                {source.label}
              </label>
            );
          })}
        </div>
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
