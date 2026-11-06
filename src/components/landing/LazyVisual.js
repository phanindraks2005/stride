'use client'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

// The landing's live pieces, split out of the first load
const VISUALS = {
  trackers: dynamic(() => import('./TrackersShowcase'), { ssr: false }),
  chat: dynamic(() => import('./LibraChat'), { ssr: false }),
  bento: dynamic(() => import('./Bento'), { ssr: false }),
  year: dynamic(() => import('./YearSection'), { ssr: false }),
  how: dynamic(() => import('./HowItWorks'), { ssr: false }),
}

// Holds the space, then loads and mounts the visual once it's a screen or so away
export default function LazyVisual({ name, minHeight, className }) {
  const ref = useRef(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true)
        io.disconnect()
      }
    }, { rootMargin: '700px 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  const Visual = VISUALS[name]
  return <div ref={ref} className={className} style={{ minHeight }}>{near && <Visual />}</div>
}
