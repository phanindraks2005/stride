'use client'
import { useEffect, useMemo, useState } from 'react'
import LibraGlyph from '@/components/LibraGlyph'
import CountUp from '@/components/CountUp'
import Heatmap from '@/components/today/Heatmap'
import TrackerCard from '@/components/today/TrackerCard'
import { useMounted } from '@/lib/useMounted'
import { demoTrackers, demoStreak } from '@/lib/demoData'
import styles from './auth.module.css'

// Log in: a returning user's streak, waiting for them
export function LoginVisual() {
  const mounted = useMounted()
  const streak = useMemo(() => (mounted ? demoStreak() : null), [mounted])
  if (!streak) return null

  return (
    <div className={styles.visual}>
      <div className={styles.visualCard}>
        <p className={styles.visualLabel}>Current streak</p>
        <p className={styles.visualBig}>
          <span className="num"><CountUp value={streak.current} duration={1400} /></span>
          <span>days</span>
        </p>
        <Heatmap byDay={streak.byDay} trackerCount={demoTrackers.length} weeks={18} months />
      </div>
      <div className={styles.visualBubble}>
        <LibraGlyph size={18} badge draw />
        <p>Morning. You&apos;re 600 ml behind yesterday&apos;s water. One glass now and you&apos;re level.</p>
      </div>
      <p className={styles.visualCaption}>Sample account</p>
    </div>
  )
}

const STARTERS = [
  { id: 1, name: 'Water', unit: 'ml', target_value: 3000 },
  { id: 2, name: 'Sleep', unit: 'hrs', target_value: 8 },
  { id: 3, name: 'Workout', unit: 'mins', target_value: 30 },
  { id: 4, name: 'Calories', unit: 'kcal', target_value: 2000 },
  { id: 5, name: 'Protein', unit: 'g', target_value: 60 },
]

// Sign up: the five trackers every account starts with, and day one of the chain
export function SignupVisual() {
  const [water, setWater] = useState(0)
  const [day1, setDay1] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setWater(500), 1400)
    const t2 = setTimeout(() => setDay1(true), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={styles.visual}>
      <div className={styles.starterGrid}>
        {STARTERS.map((t, i) => (
          <TrackerCard key={t.id} readOnly index={i} tracker={t} total={t.id === 1 ? water : 0} />
        ))}
        <div className={styles.dayOne}>
          <p className={styles.visualLabel}>Your streak</p>
          <div className={styles.chain}>
            {Array.from({ length: 7 }, (_, i) => <i key={i} data-on={(i === 0 && day1) || undefined} />)}
          </div>
          <p className={styles.dayOneText}>{day1 ? 'Day 1. Any log counts.' : 'Starts with your first log.'}</p>
        </div>
      </div>
      <p className={styles.visualCaption}>Every account starts with these five. Change them any time.</p>
    </div>
  )
}
