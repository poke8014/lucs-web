import { describe, expect, it } from 'vitest'
import { importErrorMessage, planFilename } from './planExportUi'
import type { ImportError } from './planIo'

// The DOM/Blob glue in planExportUi (buildPlanExport, downloadJson,
// readImportedFile) needs a browser and is verified manually; these two helpers
// are pure and worth pinning.

describe('planFilename', () => {
  it('slugifies a plan name into a safe json base filename', () => {
    expect(planFilename('v3 — moved the path south')).toBe('sunshower-plan-v3-moved-the-path-south')
  })

  it('collapses punctuation and trims stray separators', () => {
    expect(planFilename('  Back Fence Bed!!  ')).toBe('sunshower-plan-back-fence-bed')
  })

  it('falls back to "plan" when the name has no usable characters', () => {
    expect(planFilename('   ')).toBe('sunshower-plan-plan')
    expect(planFilename('—')).toBe('sunshower-plan-plan')
  })
})

describe('importErrorMessage', () => {
  const errors: ImportError[] = [
    'not_json',
    'not_an_object',
    'unknown_kind',
    'unsupported_version',
    'bad_shape',
  ]

  it('gives a non-empty, invitation-not-scold message for every error', () => {
    for (const e of errors) {
      const msg = importErrorMessage(e)
      expect(msg.length).toBeGreaterThan(0)
      // Friendly register: no urgency/blame words.
      expect(msg.toLowerCase()).not.toMatch(/error|invalid|failed|must/)
    }
  })
})
