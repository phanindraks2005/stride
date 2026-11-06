'use client'
import { useEffect, useRef, useState } from 'react'

function formatter(value) {
  // As many decimals as the final value has, so the count doesn't flicker through fractions
  const decimals = Number.isInteger(value) ? 0 : Math.min(2, String(value).split('.')[1]?.length || 0)
  const factor = 10 ** decimals
  const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
  return (v) => number.format(Math.round(v * factor) / factor)
}

// Animates to `value`: from `from` the first time, then from whatever it showed last,
// so a log ticks 2,100 → 2,350 instead of restarting at 0. Waits while `play` is false.
// Writes the text directly each frame instead of re-rendering React.
// Jumps straight to the value under reduced motion.
export default function CountUp({ value, duration = 1100, from = 0, play = true }) {
  const ref = useRef(null)
  const shown = useRef(from)
  const [initial] = useState(() => formatter(value)(from))

  useEffect(() => {
    if (!play) return
    const el = ref.current
    const format = formatter(value)
    const start = shown.current
    const delta = value - start
    if (!delta) return
    const length = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration
    let startTime = null
    let frame
    function animate(timestamp) {
      if (startTime === null) startTime = timestamp
      const progress = length ? Math.min((timestamp - startTime) / length, 1) : 1
      const eased = 1 - Math.pow(1 - progress, 3)
      shown.current = start + delta * eased
      // Only touch the DOM when the text changes: each write costs a layout
      const text = format(shown.current)
      if (el && el.textContent !== text) el.textContent = text
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, play])

  return <span ref={ref}>{initial}</span>
}
