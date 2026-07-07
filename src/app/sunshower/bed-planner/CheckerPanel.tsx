'use client'

import { useMemo, useState } from 'react'
import type { Finding, Severity } from './checks'

// Plan-checker panel (unit F) — presentational only. Props in, callbacks out;
// no data-fetching, no rule logic, no storage. Unit I owns the wiring
// (runChecks → findings, useCheckPrefs → dismissedKeys/onDismiss, and the
// onJump map back onto a canvas selection).
//
// Copy register throughout (spec §copy tone): "plans always change and gardens
// are never finished" — findings are invitations, never scolds. No urgency.

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CheckerPanelProps {
  /** All findings from runChecks (active + already-dismissed alike). */
  findings: Finding[]
  /** Finding keys the user has dismissed for this plan (useCheckPrefs). */
  dismissedKeys: string[]
  /** Dismiss a finding by key. */
  onDismiss: (key: string) => void
  /** Restore a dismissed finding (optional; enables the foldout's "bring back"). */
  onRestore?: (key: string) => void
  /** Jump to the finding's target on the canvas (optional; unit I maps it). */
  onJump?: (finding: Finding) => void
  /** Section id → display name, for group headers (optional; falls back to the id). */
  sectionNames?: Record<string, string>
}

const SEVERITY_ICON: Record<Severity, string> = {
  suggestion: '💡',
  worth_a_look: '⚠️',
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function CheckerPanel({
  findings,
  dismissedKeys,
  onDismiss,
  onRestore,
  onJump,
  sectionNames,
}: CheckerPanelProps) {
  const dismissedSet = useMemo(() => new Set(dismissedKeys), [dismissedKeys])

  const active = findings.filter((f) => !dismissedSet.has(f.key))
  const dismissed = findings.filter((f) => dismissedSet.has(f.key))

  // Group active findings: plan-wide first, then one group per section.
  const groups = useMemo(() => groupBySection(active, sectionNames), [active, sectionNames])

  return (
    <section className="space-y-4 rounded-xl border border-[#3b4a63]/20 bg-[#f6f4ef] p-5">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-[#2a1d10]">
          {headerLine(active.length)}
        </h2>
        <p className="text-xs text-[#2a1d10]/60">
          Advice, never rules — your plan, your call. Gardens are never finished.
        </p>
      </header>

      {active.length === 0 ? (
        <p className="rounded-lg bg-white/60 px-4 py-3 text-sm text-[#2a1d10]/70">
          Nothing’s jumping out — this plan reads as intentional. Keep going, and check
          back after you place more.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-[#3b4a63]/70">
                {group.label}
              </h3>
              <ul className="space-y-2">
                {group.findings.map((f) => (
                  <FindingCard
                    key={f.key}
                    finding={f}
                    onDismiss={onDismiss}
                    onJump={onJump}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {dismissed.length > 0 && (
        <DismissedFoldout findings={dismissed} onRestore={onRestore} />
      )}
    </section>
  )
}

// ── Finding card ──────────────────────────────────────────────────────────────

function FindingCard({
  finding,
  onDismiss,
  onJump,
}: {
  finding: Finding
  onDismiss: (key: string) => void
  onJump?: (finding: Finding) => void
}) {
  const [showWhy, setShowWhy] = useState(false)
  const is811 = finding.ruleId === 'utility_conflict' && finding.message.includes('811')

  return (
    <li className="rounded-lg border border-[#3b4a63]/15 bg-white/70 p-3.5">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-0.5 text-base leading-none">
          {SEVERITY_ICON[finding.severity]}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm text-[#2a1d10]">{finding.message}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="text-[#3b4a63] underline-offset-2 hover:underline"
              aria-expanded={showWhy}
            >
              {showWhy ? 'hide why' : 'why this matters'}
            </button>
            {onJump && (finding.sectionId || finding.placementId) && (
              <button
                type="button"
                onClick={() => onJump(finding)}
                className="text-[#3b4a63] underline-offset-2 hover:underline"
              >
                show me
              </button>
            )}
            {is811 && (
              <a
                href="tel:811"
                className="text-[#3b4a63] underline-offset-2 hover:underline"
              >
                call 811
              </a>
            )}
            <button
              type="button"
              onClick={() => onDismiss(finding.key)}
              className="text-[#2a1d10]/45 underline-offset-2 hover:underline"
            >
              dismiss
            </button>
          </div>

          {showWhy && (
            <div className="space-y-1 rounded-md bg-[#eef1f6] px-3 py-2 text-xs text-[#2a1d10]/75">
              <p>{finding.why}</p>
              <p className="text-[#3b4a63]/60">
                more in the field guide: <span className="font-medium">{finding.anchor}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

// ── Dismissed foldout ─────────────────────────────────────────────────────────

function DismissedFoldout({
  findings,
  onRestore,
}: {
  findings: Finding[]
  onRestore?: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-[#3b4a63]/15 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-[#2a1d10]/55 underline-offset-2 hover:underline"
        aria-expanded={open}
      >
        {open ? 'hide' : 'show'} dismissed ({findings.length})
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {findings.map((f) => (
            <li
              key={f.key}
              className="flex items-start justify-between gap-3 rounded-md bg-white/50 px-3 py-2 text-xs text-[#2a1d10]/55"
            >
              <span className="min-w-0 flex-1">
                <span aria-hidden className="mr-1.5">
                  {SEVERITY_ICON[f.severity]}
                </span>
                {f.message}
              </span>
              {onRestore && (
                <button
                  type="button"
                  onClick={() => onRestore(f.key)}
                  className="shrink-0 text-[#3b4a63] underline-offset-2 hover:underline"
                >
                  bring back
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Grouping + copy helpers ───────────────────────────────────────────────────

interface FindingGroup {
  id: string
  label: string
  findings: Finding[]
}

/** Plan-wide findings first (no sectionId), then one group per section, in the
 *  order sections first appear across the findings list. */
function groupBySection(
  findings: Finding[],
  sectionNames: Record<string, string> | undefined,
): FindingGroup[] {
  const planWide: Finding[] = []
  const bySection = new Map<string, Finding[]>()
  const order: string[] = []

  for (const f of findings) {
    if (!f.sectionId) {
      planWide.push(f)
      continue
    }
    if (!bySection.has(f.sectionId)) {
      bySection.set(f.sectionId, [])
      order.push(f.sectionId)
    }
    bySection.get(f.sectionId)!.push(f)
  }

  const groups: FindingGroup[] = []
  if (planWide.length > 0) {
    groups.push({ id: '__plan__', label: 'across the whole plan', findings: planWide })
  }
  for (const id of order) {
    groups.push({
      id,
      label: sectionNames?.[id] ?? 'a section',
      findings: bySection.get(id)!,
    })
  }
  return groups
}

function headerLine(count: number): string {
  if (count === 0) return 'Your plan looks good'
  if (count === 1) return '1 thing worth a look'
  return `${count} things worth a look`
}
