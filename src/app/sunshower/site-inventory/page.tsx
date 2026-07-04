import type { Metadata } from 'next'
import Walkthrough from './Walkthrough'

export const metadata: Metadata = {
  title: 'Site inventory — sunshower',
  description:
    'A guided walkthrough of your yard — feel, sun, wind, water, soil clues — that builds a site profile for choosing native plants.',
}

export default function SiteInventoryPage() {
  return <Walkthrough />
}
