import type { Metadata } from 'next'
import SelectorClient from './SelectorClient'

export const metadata: Metadata = {
  title: 'Plant selector — sunshower',
  description:
    'Browse the native California plants that belong where you live, in small batches — and get an honest read on how any plant fits your yard and what it gives the local food web.',
}

export default function PlantSelectorPage() {
  return <SelectorClient />
}
