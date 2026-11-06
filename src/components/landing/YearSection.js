'use client'
import { useMemo, useRef } from 'react'
import { useInView } from 'framer-motion'
import CountUp from '@/components/CountUp'
import Heatmap from '@/components/today/Heatmap'
import { useMounted } from '@/lib/useMounted'
import { demoTrackers, demoStreak } from '@/lib/demoData'
import styles from '@/app/page.module.css'

// A full year of the sample account, GitHub-style, with its numbers counting up
export default function YearSection() {
  const mounted = useMounted()
  const statsRef = useRef(null)
  const shown = useInView(statsRef, { once: true, amount: 0.6 })
  const streak = useMemo(() => (mounted ? demoStreak() : null), [mounted])

  const stats = useMemo(() => {
    if (!streak) return null
    const days = Object.values(streak.byDay)
    const goals = days.reduce((n, sums) => n + demoTrackers.filter((t) => (sums[t.id] || 0) >= t.target_value).length, 0)
    return { logged: days.length, goals }
  }, [streak])

  return (
    <>
      <div className={styles.yearMap}>
        {streak ? <Heatmap byDay={streak.byDay} trackerCount={demoTrackers.length} weeks={53} months size="lg" /> : <div style={{ aspectRatio: '53 / 8' }} />}
      </div>
      <dl ref={statsRef} className={styles.yearStats}>
        <div><dt>Days logged</dt><dd className="num"><CountUp value={stats?.logged ?? 0} play={shown && !!stats} duration={1500} /></dd></div>
        <div><dt>Goals hit</dt><dd className="num"><CountUp value={stats?.goals ?? 0} play={shown && !!stats} duration={1500} /></dd></div>
        <div><dt>Longest run</dt><dd className="num"><CountUp value={streak?.best ?? 0} play={shown && !!streak} duration={1500} /></dd></div>
        <div><dt>Current streak</dt><dd className="num" style={{ color: 'var(--volt)' }}><CountUp value={streak?.current ?? 0} play={shown && !!streak} duration={1500} /></dd></div>
      </dl>
    </>
  )
}
