'use client'
import { useMemo, useRef } from 'react'
import { useInView } from 'framer-motion'
import { Check } from 'lucide-react'
import LibraGlyph from '@/components/LibraGlyph'
import CountUp from '@/components/CountUp'
import Heatmap from '@/components/today/Heatmap'
import { getTrackerColor } from '@/lib/trackerIcons'
import { dayKey } from '@/lib/streakCore'
import { useMounted } from '@/lib/useMounted'
import { demoTrackers, demoStreak } from '@/lib/demoData'
import styles from '@/app/page.module.css'

const SLEEP = demoTrackers[1]

function useShown(amount = 0.4) {
  const ref = useRef(null)
  const shown = useInView(ref, { once: true, amount })
  return [ref, shown]
}

// Sleep over the last 30 days as a line that draws itself in
function SleepChart({ byDay }) {
  const [ref, shown] = useShown()
  const values = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    // A night with nothing logged keeps the line at the previous value
    values.push(byDay[dayKey(d)]?.[SLEEP.id] ?? values[values.length - 1] ?? SLEEP.target_value)
  }
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const w = 560
  const h = 170
  const min = 4
  const max = 10
  const pts = values.map((v, i) => [(i / 29) * w, h - ((v - min) / (max - min)) * h])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const goalY = h - ((SLEEP.target_value - min) / (max - min)) * h
  const hue = getTrackerColor(SLEEP.name)

  return (
    <article ref={ref} className={`${styles.tile} ${styles.tileChart} surface lift`} data-spotlight="" style={{ '--glow': hue }} data-shown={shown || undefined}>
      <div className={styles.tileHead}>
        <h3>Progress</h3>
        <p className={styles.tileStat}>
          <span className="num" style={{ color: hue }}><CountUp value={Math.round(avg * 10) / 10} play={shown} /></span>
          <span>hrs of sleep a night, last 30 days</span>
        </p>
      </div>
      <svg className={styles.lineChart} viewBox={`0 0 ${w} ${h + 6}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2={w} y1={goalY} y2={goalY} className={styles.goalLine} />
        <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`color-mix(in srgb, ${hue} 14%, transparent)`} className={styles.area} />
        <path d={line} pathLength="1" fill="none" stroke={hue} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className={styles.line} vectorEffect="non-scaling-stroke" />
      </svg>
      <p className={styles.tileFoot}><span>Goal 8 hrs</span><span>Week · Month · Year</span></p>
    </article>
  )
}

function LiftLog() {
  const [ref, shown] = useShown()
  const rows = [
    { date: 'Today', sets: '4 × 8', kg: 60, pr: true },
    { date: 'Last Tue', sets: '4 × 8', kg: 57.5 },
    { date: '2 weeks ago', sets: '4 × 6', kg: 57.5 },
    { date: '3 weeks ago', sets: '3 × 8', kg: 55 },
    { date: '4 weeks ago', sets: '3 × 8', kg: 52.5 },
  ]
  return (
    <article ref={ref} className={`${styles.tile} ${styles.tileLift} surface lift`} data-spotlight="" style={{ '--glow': 'var(--t-workout)' }} data-shown={shown || undefined}>
      <div className={styles.tileHead}>
        <h3>Bench press</h3>
        <p className={styles.tileStat}><span className="num"><CountUp value={60} play={shown} /></span><span>kg, up 7.5 in a month</span></p>
      </div>
      <ul className={styles.liftRows}>
        {rows.map((r, i) => (
          <li key={r.date} style={{ transitionDelay: `${i * 70}ms` }}>
            <span>{r.date}</span>
            <span className="tnum">{r.sets}</span>
            <span className="tnum"><b>{r.kg}</b> kg</span>
            {r.pr ? <span className={styles.pr}>Best</span> : <span />}
          </li>
        ))}
      </ul>
    </article>
  )
}

function Calendar({ byDay }) {
  const [ref, shown] = useShown()
  const today = new Date()
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7
  const daysIn = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysIn; d++) cells.push(new Date(today.getFullYear(), today.getMonth(), d))

  return (
    <article ref={ref} className={`${styles.tile} surface lift`} data-spotlight="" data-shown={shown || undefined}>
      <div className={styles.tileHead}>
        <h3>{today.toLocaleDateString('en-US', { month: 'long' })}</h3>
        <p className={styles.tileSub}>Every dot is a goal hit. Tap a day to open it.</p>
      </div>
      <div className={styles.cal}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className={styles.calWd}>{d}</span>)}
        {cells.map((date, i) => {
          if (!date) return <span key={i} />
          const sums = byDay[dayKey(date)] || {}
          const hits = demoTrackers.filter((t) => (sums[t.id] || 0) >= t.target_value).slice(0, 3)
          const future = date > today
          return (
            <span key={i} className={styles.calDay} data-today={dayKey(date) === dayKey(today) || undefined} data-future={future || undefined} style={{ transitionDelay: `${i * 12}ms` }}>
              {date.getDate()}
              <span className={styles.calDots}>
                {!future && hits.map((t) => <i key={t.id} style={{ background: getTrackerColor(t.name) }} />)}
              </span>
            </span>
          )
        })}
      </div>
    </article>
  )
}

function Streak({ streak }) {
  return (
    <article className={`${styles.tile} surface lift`} data-spotlight="">
      <div className={styles.tileHead}>
        <h3>Streak</h3>
        <p className={styles.tileStat}><span className="num" style={{ color: 'var(--volt)' }}><CountUp value={streak.current} /></span><span>days, best {streak.best}</span></p>
      </div>
      <Heatmap byDay={streak.byDay} trackerCount={demoTrackers.length} weeks={12} size="sm" />
    </article>
  )
}

function MealPlan() {
  const [ref, shown] = useShown()
  const items = [
    { name: 'Greek yoghurt, berries, oats', g: 24 },
    { name: 'Chicken wrap, side salad', g: 38 },
    { name: 'Paneer tikka, rice, dal', g: 34 },
  ]
  return (
    <article ref={ref} className={`${styles.tile} surface lift`} data-spotlight="" style={{ '--glow': 'var(--t-protein)' }} data-shown={shown || undefined}>
      <div className={styles.tileHead}>
        <h3 className={styles.tileTitleRow}><LibraGlyph size={18} draw badge />Meal plan</h3>
        <p className={styles.tileSub}>Built around the 16 g of protein you were short on yesterday.</p>
      </div>
      <ul className={styles.meals}>
        {items.map((m, i) => (
          <li key={m.name} style={{ transitionDelay: `${i * 90}ms` }}>
            <span>{m.name}</span>
            <span className={styles.mealG} style={{ color: 'var(--t-protein)' }}><CountUp value={m.g} play={shown} /> g</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function Notes() {
  return (
    <article className={`${styles.tile} surface lift`} data-spotlight="">
      <div className={styles.tileHead}>
        <h3>Notes</h3>
        <p className={styles.saved}><Check size={14} strokeWidth={3} aria-hidden="true" />Saved</p>
      </div>
      <div className={styles.note}>
        <p className={styles.noteTitle}>Deload week</p>
        <p>Drop bench to 52.5 kg, keep the reps. Sleep before 11, legs felt flat on Thursday<span className={styles.caret} /></p>
      </div>
    </article>
  )
}

export default function Bento() {
  const mounted = useMounted()
  const streak = useMemo(() => (mounted ? demoStreak() : null), [mounted])

  if (!streak) return null
  return (
    <div className={styles.bento} aria-hidden="true">
      <SleepChart byDay={streak.byDay} />
      <Streak streak={streak} />
      <LiftLog />
      <Calendar byDay={streak.byDay} />
      <MealPlan />
      <Notes />
    </div>
  )
}
