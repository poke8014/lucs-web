import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
})

export const metadata: Metadata = {
  title: 'Tang Therapeutics | Massage & Bodywork',
  description:
    'Therapeutic massage services available Friday through Sunday. Deep tissue, Swedish, and more. Book your session today.',
}

export default function MassageLayout({ children }: { children: React.ReactNode }) {
  return <div className={playfair.variable}>{children}</div>
}
