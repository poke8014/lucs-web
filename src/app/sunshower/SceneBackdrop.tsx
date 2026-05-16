'use client'

import { useEffect, useState } from 'react'
import Scene from './Scene'

// The full-bleed 3D scene is the desktop experience. On mobile it's dropped
// as a fixed background — the landing renders its own in-flow shovel stage
// instead, and the inner pages become clean scrollable documents.
export default function SceneBackdrop() {
  const [wide, setWide] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setWide(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (!wide) return null
  return <Scene />
}
