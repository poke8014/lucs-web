import type { ProductExtraction } from "@/src/lib/schemas/product-extraction";

interface ProductCardProps {
  extraction: ProductExtraction;
}

export default function ProductCard({ extraction }: ProductCardProps) {
  const topIngredients = extraction.ingredients.slice(0, 8);
  const remaining = extraction.ingredients.length - topIngredients.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {extraction.name}
        </h3>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-sm text-gray-500">{extraction.brand}</span>
          {extraction.price && (
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {extraction.price}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        {/* Ingredients */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Ingredients
          </h4>
          <div className="mt-2 space-y-1.5">
            {topIngredients.map((ing, i) => (
              <div key={i} className="flex items-baseline justify-between text-sm">
                <span className="text-gray-700">{ing.name}</span>
                {(ing.amount || ing.unit) && (
                  <span className="ml-2 shrink-0 text-xs text-gray-400">
                    {[ing.amount, ing.unit].filter(Boolean).join(" ")}
                  </span>
                )}
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-xs text-gray-400">
                +{remaining} more ingredient{remaining > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Claims */}
        {extraction.claims.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Claims
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extraction.claims.map((claim, i) => (
                <span
                  key={i}
                  className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700"
                >
                  {claim}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {extraction.certifications.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Certifications
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extraction.certifications.map((cert, i) => (
                <span
                  key={i}
                  className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700"
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
