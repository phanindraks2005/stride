'use client'
import { useEffect, useRef } from 'react'

// Runs an async script of timed steps while `active` is true. Leaving cancels it;
// coming back starts it again from the top. Under reduced motion `instant` runs instead.
export function useSequence(active, script, instant) {
  const scriptRef = useRef(script)
  const instantRef = useRef(instant)
  useEffect(() => {
    scriptRef.current = script
    instantRef.current = instant
  })

  useEffect(() => {
    if (!active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      instantRef.current?.()
      return
    }
    let cancelled = false
    const timers = new Set()
    const wait = (ms) => new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        timers.delete(t)
        if (cancelled) reject(new Error('cancelled'))
        else resolve()
      }, ms)
      timers.add(t)
    })
    scriptRef.current(wait).catch(() => {})
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [active])
}
