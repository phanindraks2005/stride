'use client'
import { useEffect, useRef, useState } from 'react'
import { dayKey } from '@/lib/streakCore'
import styles from './Heatmap.module.css'

// Built once: a formatter per cell was the slowest part of drawing the map
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short' })
const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', '']
const LEVEL_LABEL = ['nothing logged', '1 tracker', 'a few trackers', 'most trackers', 'every tracker']
const GOAL_LABEL = ['nothing logged', 'under a third of the goal', 'under two thirds of the goal', 'nearly there', 'goal reached']

// Weeks as columns (Monday on top), lime by how many trackers were logged that day.
// With `tracker`, it shows how close that tracker got to its goal, in its own hue.
// Cells fade in column by column the first time the map scrolls into view.
// tone="ink" draws the cells in dark ink, for a map sitting on a bright feature card
export default function Heatmap({ byDay, trackerCount, tracker, hue, weeks = 12, today = new Date(), months = false, size = 'md', tone, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true)
        io.disconnect()
      }
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Start on the Monday `weeks - 1` weeks before this week's Monday
  const end = new Date(today)
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (weeks - 1) * 7)

  const columns = []
  let logged = 0
  for (let w = 0; w < weeks; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      if (date > end) { col.push(null); continue }
      const sums = byDay[dayKey(date)]
      const has = tracker ? Boolean(sums?.[tracker.id]) : Boolean(sums)
      if (has) logged++
      const ratio = tracker
        ? (tracker.target_value > 0 ? (sums?.[tracker.id] || 0) / tracker.target_value : 1)
        : trackerCount ? Object.keys(sums || {}).length / trackerCount : 0
      const level = !has ? 0 : ratio >= 0.99 ? 4 : ratio >= 0.6 ? 3 : ratio >= 0.3 ? 2 : 1
      col.push({ date, level, today: date.getTime() === end.getTime() })
    }
    columns.push(col)
  }

  const monthLabels = months
    ? columns.map((col, i) => {
        const first = col.find(Boolean)
        const prev = columns[i - 1]?.find(Boolean)
        return first && (!prev || prev.date.getMonth() !== first.date.getMonth())
          ? MONTH.format(first.date)
          : ''
      })
    : null

  return (
    <figure ref={ref} className={`${styles.map} ${styles[size]} ${tracker ? styles.hued : ''} ${tone === 'ink' ? styles.ink : ''} ${className}`} style={hue ? { '--hue': hue } : undefined} data-shown={shown || undefined}>
      <figcaption className="sr-only">{logged} days logged in the last {weeks} weeks</figcaption>
      {months && (
        <div className={styles.months} style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }} aria-hidden="true">
          {monthLabels.map((m, i) => <span key={i}>{m}</span>)}
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.weekdays} aria-hidden="true">
          {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }} aria-hidden="true">
          {columns.map((col, w) => col.map((cell, d) => (
            <span
              key={`${w}-${d}`}
              className={styles.cell}
              data-level={cell ? cell.level : undefined}
              data-today={cell?.today || undefined}
              data-empty={!cell || undefined}
              style={{ gridColumn: w + 1, gridRow: d + 1 }}
              title={cell ? `${DAY.format(cell.date)}: ${(tracker ? GOAL_LABEL : LEVEL_LABEL)[cell.level]}` : undefined}
            />
          )))}
        </div>
      </div>
    </figure>
  )
}
