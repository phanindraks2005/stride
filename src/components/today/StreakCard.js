'use client'
import { useId } from 'react'
import CountUp from '@/components/CountUp'
import styles from './today.module.css'

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function StreakCard({ current, best, chain, compact = false, className = '' }) {
  const titleId = useId()
  return (
    <section className={`${styles.card} ${styles.streak} ${compact ? styles.compact : ''} ${className}`} aria-labelledby={titleId}>
      <div className={styles.streakTop}>
        <div>
          <h2 id={titleId} className={styles.cardTitle}>Streak</h2>
          <p className={styles.cardSub}>
            {current > 0 ? `Best ${best} day${best === 1 ? '' : 's'}` : 'Log anything today to start one'}
          </p>
        </div>
        <p className={styles.streakNum}>
          <span className="num"><CountUp value={current} /></span>
          <span className={styles.streakUnit}>day{current === 1 ? '' : 's'}</span>
        </p>
      </div>
      <ol className={styles.chain} aria-label="Last 14 days">
        {chain.map((day, i) => (
          <li key={i} className={styles.chainDay}>
            <span
              className={styles.chainCell}
              data-logged={day.logged || undefined}
              data-today={day.today || undefined}
              style={{ animationDelay: `${i * 35}ms` }}
            />
            <span className={styles.chainLabel} aria-hidden="true">{WEEKDAY[day.date.getDay()]}</span>
            <span className="sr-only">
              {day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}: {day.logged ? 'logged' : 'nothing logged'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
