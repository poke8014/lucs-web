import type { Metadata } from 'next'
import SceneBackdrop from './SceneBackdrop'

export const metadata: Metadata = {
  title: 'Pollinator Garden — Native CA Garden Planner',
  description:
    'Plan, prepare, plant, and maintain a native California pollinator garden. Start with cleanup and weed identification.',
}

export default function PollinatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Desktop: locked full-viewport stage with the fixed 3D backdrop.
    // Mobile: a natural-height, scrollable document (no fixed backdrop).
    <div className="relative w-full min-h-dvh bg-[#f7e9c9] text-[#2a1d10] md:h-dvh md:overflow-hidden">
      <SceneBackdrop />
      {children}
    </div>
  )
}
