'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Photo } from './types'

type Props = {
  photos: Photo[]
  index: number
  onIndexChange: (i: number) => void
  caption?: string
  onClose: () => void
}

export default function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  caption,
  onClose,
}: Props) {
  // Portal the lightbox to <body> so it escapes the cleanup-plan card
  // stacking contexts (each card uses backdrop-blur, which establishes a
  // new stacking context — fixed + z-50 alone gets clipped by sibling
  // cards). `mounted` gate avoids SSR hydration mismatches.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const photo = photos[index]
  const total = photos.length
  const goPrev = () => onIndexChange((index - 1 + total) % total)
  const goNext = () => onIndexChange((index + 1) % total)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && total > 1) goPrev()
      else if (e.key === 'ArrowRight' && total > 1) goNext()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, onClose])

  // Prefetch neighbors (with carousel wrap) so arrow navigation feels
  // instant — the next image is in the browser cache by the time the
  // user clicks › or ‹.
  useEffect(() => {
    if (total <= 1) return
    const prevIdx = (index - 1 + total) % total
    const nextIdx = (index + 1) % total
    for (const i of [prevIdx, nextIdx]) {
      if (i === index) continue
      const img = new Image()
      img.src = photos[i].url
    }
  }, [index, total, photos])

  if (!photo || !mounted) return null

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={caption ? `${caption} photo viewer` : 'Photo viewer'}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-2xl leading-none text-white hover:bg-white/20"
      >
        ×
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-1 text-3xl leading-none text-white hover:bg-white/20"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-1 text-3xl leading-none text-white hover:bg-white/20"
          >
            ›
          </button>
        </>
      )}

      <div
        className="flex max-h-full max-w-5xl flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={caption ?? ''}
          className="max-h-[80vh] max-w-full rounded-md object-contain"
        />
        <div className="max-w-2xl text-center text-sm text-white/80">
          {caption && <p className="italic">{caption}</p>}
          <p className="mt-1 text-xs">
            {index + 1} of {photos.length} · {photo.attribution}
          </p>
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
