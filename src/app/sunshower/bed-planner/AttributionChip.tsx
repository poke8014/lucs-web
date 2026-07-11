// Attribution chip — rendered over any canvas container that shows a satellite
// or user-uploaded underlay. Sits absolute bottom-right as an HTML overlay div,
// outside the SVG so it stays legible and doesn't interfere with canvas events.
//
// Mapbox's terms require visible attribution whenever their imagery displays —
// including the session-only (keep-off) case, where we requested
// `attribution=false` on the URL and must therefore supply our own chip.
//
// Nothing renders when `attribution` is undefined or empty (user-uploaded images
// leave `imageAttribution` unset, so uploads don't show a chip).

export default function AttributionChip({ attribution }: { attribution: string | undefined }) {
  if (!attribution) return null
  return (
    <div
      className="pointer-events-none absolute bottom-1.5 right-1.5 rounded px-1.5 py-0.5 text-[10px] leading-snug text-[#2a1d10]/70"
      style={{ background: 'rgba(255,246,223,0.82)' }}
    >
      {attribution}
    </div>
  )
}
