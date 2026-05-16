export type YardState = 'overgrown' | 'partial' | 'bare' | 'established'

export function isYardState(value: string | null | undefined): value is YardState {
  return (
    value === 'overgrown' ||
    value === 'partial' ||
    value === 'bare' ||
    value === 'established'
  )
}

export function routeForYardState(state: YardState): string {
  switch (state) {
    case 'overgrown':
      return '/sunshower/cleanup-plan?yard=overgrown'
    case 'partial':
      return '/sunshower/cleanup-plan?yard=partial'
    case 'bare':
      return '/sunshower/site-inventory'
    case 'established':
      return '/sunshower/care'
  }
}
