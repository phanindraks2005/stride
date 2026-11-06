'use client'
import { useId } from 'react'
import CountUp from '@/components/CountUp'
import Heatmap from './Heatmap'
import styles from './hero.module.css'

// The dashboard's lead card: the streak as big as it gets, the best run, 12 weeks of history
export default function StreakHero({ current, best, byDay, trackerCount }) {
  const titleId = useId()
  const toBest = best - current

  return (
    <section className={`${styles.card} ${styles.hero} feature`} style={{ '--g1': 'var(--volt)', '--g2': 'var(--a-teal)' }} aria-labelledby={titleId}>
      <div className={styles.heroNumbers}>
        <h2 id={titleId} className={styles.label}>Current streak</h2>
        <p className={styles.big}>
          <span className="num"><CountUp value={current} duration={1400} /></span>
          <span className={styles.bigUnit}>day{current === 1 ? '' : 's'}</span>
        </p>
        <p className={styles.note}>
          {current === 0
            ? 'Log anything today to start one.'
            : toBest <= 0
              ? 'Your best run yet. Keep it alive.'
              : `${toBest} more day${toBest === 1 ? '' : 's'} to beat your best.`}
        </p>
        <dl className={styles.best}>
          <div>
            <dt>Best streak</dt>
            <dd><span className="num"><CountUp value={best} /></span> days</dd>
          </div>
        </dl>
      </div>
      <div className={styles.heroMap}>
        <Heatmap byDay={byDay} trackerCount={trackerCount} weeks={12} months tone="ink" />
        <p className={styles.legend} aria-hidden="true">
          Less <i data-level="0" /><i data-level="1" /><i data-level="2" /><i data-level="3" /><i data-level="4" /> More
        </p>
      </div>
    </section>
  )
}
