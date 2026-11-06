'use client'
import { useId } from 'react'
import { getTrackerColor } from '@/lib/trackerIcons'
import { weekStats, weekInsight } from '@/lib/insights'
import LibraGlyph from '@/components/LibraGlyph'
import CountUp from '@/components/CountUp'
import styles from './hero.module.css'

// Goals hit on each of the last 7 days, stacked in tracker colours, plus Libra's one-liner
export default function WeekCard({ trackers, byDay }) {
  const titleId = useId()
  const stats = weekStats(trackers, byDay)
  const total = stats.days.reduce((n, d) => n + d.hit.length, 0)
  const max = Math.max(1, trackers.length)

  return (
    <section className={`${styles.card} ${styles.week}`} aria-labelledby={titleId}>
      <div className={styles.weekHead}>
        <div>
          <h2 id={titleId} className={styles.label}>This week</h2>
          <p className={styles.weekTotal}><span className="num"><CountUp value={total} /></span> goals hit</p>
        </div>
        <ul className={styles.keys} aria-label="Days on target per tracker">
          {stats.perTracker.map(({ tracker, days }) => (
            <li key={tracker.id} style={{ '--hue': getTrackerColor(tracker) }}>
              <i aria-hidden="true" />{tracker.name}<b className="tnum">{days}/7</b>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={styles.bars}
        role="img"
        aria-label={stats.days.map((d) => `${d.date.toLocaleDateString('en-US', { weekday: 'long' })}: ${d.hit.length} goals`).join(', ')}
      >
        {stats.days.map((d, i) => (
          <div key={i} className={styles.barCol} data-today={i === 6 || undefined}>
            <div className={styles.barTrack}>
              {/* One animation per day, not per segment */}
              <span className={styles.stack} style={{ animationDelay: `${i * 70}ms` }}>
                {trackers.filter((t) => d.hit.includes(t.id)).map((t) => (
                  <span key={t.id} className={styles.seg} style={{ height: `calc(${100 / max}% - 2px)`, background: getTrackerColor(t) }} />
                ))}
              </span>
            </div>
            <span className={styles.barDay}>{d.date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
          </div>
        ))}
      </div>

      <p className={styles.insight}>
        <LibraGlyph size={16} draw badge />
        <span>{weekInsight(stats)}</span>
      </p>
    </section>
  )
}
