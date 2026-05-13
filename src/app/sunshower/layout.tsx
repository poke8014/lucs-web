import type { Metadata } from 'next'
import Scene from './Scene'

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
    <div className="relative h-dvh w-full overflow-hidden bg-[#f7e9c9] text-[#2a1d10]">
      <Scene />
      {children}
    </div>
  )
}
