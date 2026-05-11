import type { Metadata } from 'next'

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
  return <div className="min-h-screen bg-stone-50 text-stone-900">{children}</div>
}
