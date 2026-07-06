// Photo thumb with a graceful no-photo fallback — natives carry no photos yet
// (only the invasive set was scraped), so "no photo" is the common case on the
// browse surface, not an error. Falls back to the plant's initial on a warm
// tile. iNat thumbnails swap /large. → /medium. for payload (see photoUrl.ts).

import type { SelectorPlant } from './types'

function thumbUrl(url: string): string {
  return url.replace('/large.', '/medium.')
}

export default function PlantThumb({
  plant,
  className = '',
}: {
  plant: SelectorPlant
  className?: string
}) {
  const photo = plant.photos?.[0]
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbUrl(photo.url)}
        alt=""
        loading="lazy"
        className={'object-cover ' + className}
      />
    )
  }
  const initial = (plant.common_names[0] ?? plant.scientific_name)
    .charAt(0)
    .toUpperCase()
  return (
    <span
      aria-hidden
      className={
        'flex items-center justify-center bg-emerald-800/10 font-serif text-emerald-900/50 ' +
        className
      }
    >
      {initial}
    </span>
  )
}
