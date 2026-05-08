import { checkNsfSport, refreshNsfSportCache } from "./nsf-sport";
import { checkInformedSport, refreshInformedSportCache } from "./informed-sport";
import { checkUsp, refreshUspCache } from "./usp";
import { checkIfos, refreshIfosCache } from "./ifos";
import { prisma } from "../prisma";

const CERT_SOURCE_IDS = [
  "nsf_sport",
  "informed_sport",
  "usp_verified",
  "ifos",
  "bscg",
] as const;

export type CertSourceId = (typeof CERT_SOURCE_IDS)[number];

export interface CertificationResult {
  source: CertSourceId;
  certified: boolean;
  productName?: string;
  brand?: string;
  certTypes?: string[];
}

export interface CertificationResults {
  results: CertificationResult[];
  checked: CertSourceId[];
  skipped: CertSourceId[];
}

/**
 * Ensure a source's cache is populated and fresh.
 * If the ScrapeCache entry is missing or expired, trigger a refresh.
 */
async function ensureCacheFresh(source: CertSourceId): Promise<void> {
  const cached = await prisma.scrapeCache.findUnique({
    where: { source },
  });

  if (cached && cached.expiresAt > new Date()) {
    return; // Cache is fresh
  }

  switch (source) {
    case "nsf_sport":
      await refreshNsfSportCache();
      break;
    case "informed_sport":
      await refreshInformedSportCache();
      break;
    case "usp_verified":
      await refreshUspCache();
      break;
    case "ifos":
      await refreshIfosCache();
      break;
    case "bscg":
      // Not implemented yet
      break;
  }
}

/**
 * Check a single certification source for a product/brand match.
 */
async function checkSource(
  source: CertSourceId,
  productName: string,
  brand: string,
): Promise<CertificationResult | null> {
  switch (source) {
    case "nsf_sport": {
      const r = await checkNsfSport(productName, brand);
      return r ? { source, ...r } : null;
    }
    case "informed_sport": {
      const r = await checkInformedSport(productName, brand);
      return r ? { source, ...r } : null;
    }
    case "usp_verified": {
      const r = await checkUsp(productName, brand);
      return r ? { source, ...r } : null;
    }
    case "ifos": {
      const r = await checkIfos(productName, brand);
      return r ? { source, ...r } : null;
    }
    case "bscg":
      // Not implemented yet
      return null;
  }
}

/**
 * Unified certification check across all (or selected) sources.
 *
 * - Ensures each source's cache is populated before querying
 * - Only queries sources in the `sources` array (defaults to all)
 * - Returns per-source results plus which sources were checked/skipped
 *
 * Individual source failures are caught and logged — they don't
 * fail the entire check.
 */
export async function checkCertifications(
  productName: string,
  brand: string,
  sources?: CertSourceId[],
): Promise<CertificationResults> {
  const selectedSources = sources ?? [...CERT_SOURCE_IDS];
  const skipped = CERT_SOURCE_IDS.filter((s) => !selectedSources.includes(s));

  const results: CertificationResult[] = [];
  const checked: CertSourceId[] = [];

  // Refresh caches in parallel for all selected sources
  await Promise.allSettled(
    selectedSources.map(async (source) => {
      try {
        await ensureCacheFresh(source);
      } catch (err) {
        console.warn(
          `[certifications] Failed to refresh ${source} cache:`,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );

  // Query each source in parallel
  const lookups = await Promise.allSettled(
    selectedSources.map(async (source) => {
      try {
        const result = await checkSource(source, productName, brand);
        checked.push(source);
        if (result) {
          results.push(result);
        }
      } catch (err) {
        console.warn(
          `[certifications] Failed to check ${source}:`,
          err instanceof Error ? err.message : err,
        );
        // Still count as checked even if it errored
        checked.push(source);
      }
    }),
  );

  // Log any unexpected rejections
  for (const outcome of lookups) {
    if (outcome.status === "rejected") {
      console.error("[certifications] Unexpected rejection:", outcome.reason);
    }
  }

  return { results, checked, skipped };
}
