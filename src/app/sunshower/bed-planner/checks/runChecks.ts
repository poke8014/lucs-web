// runChecks — the checker entry point (spec §"The plan checker").
//
// Pure: (plan, profile, corpus) → Finding[]. Runs all 13 rules, concatenates
// their findings in the rule table's order, and de-dupes on `key` (defensive —
// keys are already unique per rule, but a stable de-dupe guarantees the
// dismissal set never sees two findings sharing a key). Nothing here blocks
// anything — the return value is advisory input to the panel.

import type { GardenPlan } from '../types'
import type { SelectorPlant } from '../../plant-selector/types'
import type { SiteProfile } from '../../site-inventory/types'
import type { Finding } from './types'
import { ALL_RULES, makeContext } from './rules'

export function runChecks(
  plan: GardenPlan,
  profile: SiteProfile | null,
  corpus: SelectorPlant[],
): Finding[] {
  const ctx = makeContext(plan, profile, corpus)
  const out: Finding[] = []
  const seen = new Set<string>()
  for (const rule of ALL_RULES) {
    for (const finding of rule(ctx)) {
      if (seen.has(finding.key)) continue
      seen.add(finding.key)
      out.push(finding)
    }
  }
  return out
}
