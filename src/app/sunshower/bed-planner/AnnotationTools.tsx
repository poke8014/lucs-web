'use client'

// AnnotationTools — unit G, module 5b.
//
// Presentational toolbar for adding and managing annotations. Props in, callbacks
// out — no own state, no pointer wiring.
//
// INTENDED FLOW (for unit I's wiring):
//   1. User picks a kind from the kind picker (onKindChange fires).
//   2. If the kind is a point annotation (wet_spot / hose_bib / keeper_plant /
//      note), unit I routes the next canvas tap (CanvasStage's
//      `onBackgroundPointerDown`) to createAnnotation(kind, feetPoint) and
//      appends it to plan.annotations.
//   3. If the kind is a polygon annotation (utility), unit I starts a polygon
//      trace exactly like SectionsStep's polygon mode — vertex-by-vertex via
//      onBackgroundPointerDown, closed on the first-corner-tap or Enter.
//   4. If `activeKind === null`, canvas taps are not captured by annotation mode.
//
//   For 'note' kind, unit I should show the pendingNote input before or after
//   placement; passing the note to createAnnotation's third arg includes it.
//
//   Selected annotation deletion: onDelete fires with the selectedId. Unit I
//   removes the matching annotation from plan.annotations.

import type { Annotation } from './types'
import { annotationLabel, POINT_ANNOTATION_KINDS, POLYGON_ANNOTATION_KINDS } from './annotations'

const ALL_KINDS: Annotation['kind'][] = [
  ...POINT_ANNOTATION_KINDS,
  ...POLYGON_ANNOTATION_KINDS,
]

export interface AnnotationToolsProps {
  /** The currently active annotation kind, or null if annotation mode is off. */
  activeKind: Annotation['kind'] | null
  onKindChange: (kind: Annotation['kind'] | null) => void
  /** Pending note text for the 'note' kind. */
  pendingNote: string
  onNoteChange: (note: string) => void
  /** Fires with the selected annotation's id when the Delete button is pressed. */
  onDelete?: (id: string) => void
  /** The currently selected annotation id (for the Delete action). */
  selectedId?: string | null
}

export default function AnnotationTools({
  activeKind,
  onKindChange,
  pendingNote,
  onNoteChange,
  onDelete,
  selectedId,
}: AnnotationToolsProps) {
  function toggleKind(kind: Annotation['kind']) {
    // Tapping the active kind again deactivates annotation mode.
    onKindChange(activeKind === kind ? null : kind)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#2a1d10]/55">
        Annotations
      </p>

      {/* Kind picker */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_KINDS.map((kind) => {
          const meta = annotationLabel(kind)
          const active = activeKind === kind
          const isPolyKind = POLYGON_ANNOTATION_KINDS.includes(kind)
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              aria-pressed={active}
              title={isPolyKind ? `${meta.label} — click to trace a region` : `${meta.label} — click to place`}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ' +
                (active
                  ? 'border-[#2a1d10] bg-[#2a1d10] text-[#f7e9c9]'
                  : 'border-[#2a1d10]/25 bg-transparent text-[#2a1d10]/80 hover:border-[#2a1d10]/50')
              }
            >
              <span aria-hidden>{meta.icon}</span>
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Context cue when a kind is active */}
      {activeKind && (
        <p className="rounded-md bg-[#fff6df] px-3 py-2 text-sm text-[#2a1d10]/70">
          {POLYGON_ANNOTATION_KINDS.includes(activeKind)
            ? 'Click the map to trace the region corners. Click near the first corner or press Enter to close.'
            : 'Click anywhere on the map to drop the marker. Plans always change and gardens are never finished.'}
        </p>
      )}

      {/* Note input — only for the 'note' kind */}
      {activeKind === 'note' && (
        <div className="space-y-1">
          <label className="block text-xs text-[#2a1d10]/65">
            Note text (optional)
          </label>
          <input
            type="text"
            value={pendingNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="e.g. good morning sun here"
            maxLength={120}
            className="w-full rounded-md border border-[#2a1d10]/20 bg-white px-3 py-1.5 text-sm text-[#2a1d10] placeholder:text-[#2a1d10]/35 focus:border-[#2a1d10]/50 focus:outline-none"
          />
        </div>
      )}

      {/* Delete selected annotation */}
      {selectedId && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(selectedId)}
          className="w-full rounded-md border border-red-200 bg-red-50 py-1.5 text-sm text-red-600 transition hover:bg-red-100"
        >
          Remove annotation
        </button>
      )}
    </div>
  )
}
