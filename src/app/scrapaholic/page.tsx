export default function ScrapaholicPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Scrapaholic
        </h1>
        <p className="mt-2 text-lg text-gray-500">
          Clinical Product Verification Engine
        </p>
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-gray-600">
            Paste 2-4 supplement URLs to compare trust scores, ingredient
            evidence, and real user sentiment.
          </p>
          <div className="mt-6 text-xs text-gray-400">
            Under construction — Milestone 1
          </div>
        </div>
      </div>
    </main>
  );
}
