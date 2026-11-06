'use client'
import { useEffect, useRef } from 'react'
import styles from '@/app/page.module.css'

// A heading whose lines slide up out of a mask, one after another, when it scrolls into view.
// Pass the lines explicitly so the breaks are the designed ones at every width.
// The text is in the server HTML; only the slide waits for the browser.
export default function LineReveal({ as: Tag = 'h2', lines, className = '', id }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // The observer's first report says where the heading starts, without forcing a layout.
    // Already on screen then: leave it, the reveal would only flash.
    let first = true
    const io = new IntersectionObserver(([entry]) => {
      if (first) {
        first = false
        if (entry.isIntersecting) return io.disconnect()
        // Hide the lines only once we know they'll be revealed
        el.dataset.lines = 'waiting'
        return
      }
      if (entry.isIntersecting) {
        el.dataset.lines = 'shown'
        io.disconnect()
      }
    }, { rootMargin: '0px 0px -12% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag ref={ref} id={id} className={`${className} ${styles.lines}`} >
      {lines.map((line, i) => (
        <span key={i} className={styles.mask}>
          <span style={{ animationDelay: `${i * 90}ms` }}>{line}</span>
        </span>
      ))}
    </Tag>
  )
}
