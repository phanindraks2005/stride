'use client'
import { useEffect, useState } from 'react'

export default function CountUp({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let startTime = null
    let animationFrame

    function animate(timestamp) {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <>{display}</>
}