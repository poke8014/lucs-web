'use client'

import { useEffect } from 'react'
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
  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1)
      else if (e.key === 'ArrowRight' && hasNext) onIndexChange(index + 1)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, hasPrev, hasNext, onClose, onIndexChange])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
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

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange(index - 1)
          }}
          aria-label="Previous photo"
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-1 text-3xl leading-none text-white hover:bg-white/20"
        >
          ‹
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange(index + 1)
          }}
          aria-label="Next photo"
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-1 text-3xl leading-none text-white hover:bg-white/20"
        >
          ›
        </button>
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
}
