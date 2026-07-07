import type { Metadata } from 'next'
import BedPlannerClient from './BedPlannerClient'

export const metadata: Metadata = {
  title: 'Bed planner — sunshower',
  description:
    'Turn your yard into a plan you can plant: map the space, carve it into sections, and fill each with native California plants. Plans are cheap to fork and nothing is ever final.',
}

export default function BedPlannerPage() {
  return <BedPlannerClient />
}
