'use client'

import type { SiteProfile } from '../types'

// Shared input primitives for the walkthrough steps. Mobile-first: all
// text inputs are text-base (16px) so iOS doesn't zoom on focus.

export interface StepProps {
  profile: SiteProfile
  updateProfile: (patch: Partial<SiteProfile>) => void
}

export const PANEL =
  'rounded-lg border border-[#2a1d10]/15 bg-[#fff6df]/90 shadow-sm backdrop-blur-sm'

export const INPUT =
  'w-full rounded-md border border-[#2a1d10]/25 bg-white/70 px-3 py-2 text-base text-[#2a1d10] placeholder:text-[#2a1d10]/40 focus:border-[#2a1d10]/60 focus:outline-none'

export function StepIntro({
  why,
  task,
}: {
  why: React.ReactNode
  task: React.ReactNode
}) {
  return (
    <div className="mb-5 space-y-4">
      <p className="text-sm text-[#2a1d10]/80 sm:text-base">{why}</p>
      <div className={PANEL + ' p-4'}>
        <p className="text-xs uppercase tracking-[0.14em] text-emerald-800/80">
          Do this
        </p>
        <div className="mt-1.5 text-sm text-[#2a1d10]/85">{task}</div>
      </div>
    </div>
  )
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#2a1d10]/60">
      {children}
    </p>
  )
}

/** Stacked tap-target choice cards — the primary single-select input. */
export function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
  name,
}: {
  value: T | undefined
  onChange: (value: T) => void
  options: { value: T; label: string; hint?: string }[]
  name: string
}) {
  return (
    <div role="radiogroup" aria-label={name} className="space-y-2">
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={
              'block w-full rounded-md border px-4 py-3 text-left transition ' +
              (selected
                ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                : 'border-[#2a1d10]/25 bg-[#fff6df]/70 text-[#2a1d10] hover:border-[#2a1d10]/60')
            }
          >
            <span className="block text-base font-medium">{opt.label}</span>
            {opt.hint && (
              <span
                className={
                  'mt-0.5 block text-sm ' +
                  (selected ? 'text-[#f7e9c9]/75' : 'text-[#2a1d10]/60')
                }
              >
                {opt.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Compact pill row for short enumerable choices (cardinals, tiers). */
export function ChoicePills<T extends string>({
  value,
  onChange,
  options,
  name,
}: {
  value: T | undefined
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  name: string
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={
              'rounded-full border px-3.5 py-1.5 text-sm transition ' +
              (selected
                ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                : 'border-[#2a1d10]/30 bg-[#fff6df]/70 text-[#2a1d10]/80 hover:border-[#2a1d10]/60 hover:text-[#2a1d10]')
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function NotesInput({
  value,
  onChange,
  placeholder,
  label = 'Notes (optional)',
}: {
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={INPUT + ' resize-y'}
      />
    </div>
  )
}
