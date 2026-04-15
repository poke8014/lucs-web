import type { SentimentResult } from "@/src/lib/schemas/sentiment-result";

interface SentimentPanelProps {
  sentiment: SentimentResult;
}

function scoreColor(score: number): string {
  if (score >= 7) return "text-green-600";
  if (score >= 4) return "text-yellow-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 7) return "bg-green-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-red-500";
}

function confidenceBadge(level: string): { bg: string; text: string } {
  switch (level) {
    case "high":
      return { bg: "bg-green-50 text-green-700", text: "High confidence" };
    case "medium":
      return { bg: "bg-yellow-50 text-yellow-700", text: "Medium confidence" };
    default:
      return { bg: "bg-gray-100 text-gray-500", text: "Low confidence" };
  }
}

function sentimentIcon(s: string): string {
  switch (s) {
    case "positive":
      return "+";
    case "negative":
      return "-";
    default:
      return "~";
  }
}

/** Normalise a quote source into a full Reddit URL without doubling the domain. */
function redditSourceHref(source: string): string {
  if (source.startsWith("http")) return source;
  // Strip leading "reddit.com" or "www.reddit.com" if present (Gemini sometimes omits the scheme)
  const stripped = source.replace(/^(www\.)?reddit\.com/, "");
  return `https://reddit.com${stripped.startsWith("/") ? "" : "/"}${stripped}`;
}

function sentimentTextColor(s: string): string {
  switch (s) {
    case "positive":
      return "text-green-600";
    case "negative":
      return "text-red-600";
    default:
      return "text-gray-500";
  }
}

export default function SentimentPanel({ sentiment }: SentimentPanelProps) {
  const badge = confidenceBadge(sentiment.confidenceLevel);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Reddit Sentiment
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg}`}
          >
            {badge.text}
          </span>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        {/* Score gauge */}
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(sentiment.overallScore / 10) * 100} 100`}
                strokeLinecap="round"
                className={scoreBg(sentiment.overallScore)}
              />
            </svg>
            <span
              className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreColor(sentiment.overallScore)}`}
            >
              {sentiment.overallScore}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Overall Score
            </p>
            <p className="text-xs text-gray-400">
              {sentiment.totalMentions} mention{sentiment.totalMentions !== 1 ? "s" : ""} analyzed
            </p>
          </div>
        </div>

        {/* Themes */}
        {sentiment.themes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Themes
            </h4>
            <div className="mt-2 space-y-1.5">
              {sentiment.themes.map((theme, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${sentimentTextColor(theme.sentiment)}`}
                  >
                    {sentimentIcon(theme.sentiment)}
                  </span>
                  <span className="text-gray-700">{theme.label}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {theme.mentionCount}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Representative quotes */}
        {sentiment.representativeQuotes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              What people say
            </h4>
            <div className="mt-2 space-y-3">
              {sentiment.representativeQuotes.map((quote, i) => (
                <blockquote
                  key={i}
                  className={`border-l-2 pl-3 text-sm ${
                    quote.sentiment === "positive"
                      ? "border-green-300"
                      : quote.sentiment === "negative"
                        ? "border-red-300"
                        : "border-gray-300"
                  }`}
                >
                  <p className="text-gray-600 italic">
                    &ldquo;{quote.text}&rdquo;
                  </p>
                  {quote.source && (
                    <a
                      href={redditSourceHref(quote.source)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-blue-500 hover:underline"
                    >
                      source
                    </a>
                  )}
                </blockquote>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
