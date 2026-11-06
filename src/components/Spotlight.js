'use client'
import { useEffect } from 'react'

// One pointer listener for every [data-spotlight] card on the page (fine pointers only)
export default function Spotlight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let frame = 0
    function onMove(e) {
      const card = e.target.closest?.('[data-spotlight]')
      if (!card) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect()
        card.style.setProperty('--mx', `${e.clientX - r.left}px`)
        card.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      document.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])
  return null
}
