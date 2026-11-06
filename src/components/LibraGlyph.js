'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './LibraGlyph.module.css'

// The Libra sign drawn as strokes: a beam with a raised arch over a flat base line.
// state: 'idle' | 'thinking' (the beam tips like scales) | 'reply' (a lime pulse)
// draw: stroke draws in the first time the glyph is seen.
export default function LibraGlyph({ size = 24, state = 'idle', draw = false, badge = false, inherit = false, className = '', title }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(!draw)

  useEffect(() => {
    if (!draw || seen) return
    const el = ref.current
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true)
        io.disconnect()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [draw, seen])

  return (
    <span
      ref={ref}
      className={`${styles.glyph} ${badge ? styles.badge : ''} ${inherit ? styles.inherit : ''} ${className}`}
      data-state={state}
      data-draw={draw ? (seen ? 'in' : 'wait') : undefined}
      style={{ '--size': `${size}px` }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span className={styles.glow} />
      <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path className={styles.beam} pathLength="1" d="M5 24.5h8.2a7.3 7.3 0 1 1 13.6 0H35" />
        <path className={styles.base} pathLength="1" d="M5 31.5h30" />
      </svg>
    </span>
  )
}
