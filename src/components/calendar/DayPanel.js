'use client'
import { createElement, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Dumbbell, NotebookPen, X } from 'lucide-react'
import { getTrackerColor, getTrackerIcon } from '@/lib/trackerIcons'
import { useDemo } from '@/lib/useDemo'
import { kg } from '@/lib/fitness'
import { fmt, timeOf } from '@/components/today/format'
import Skeleton from '@/components/Skeleton'
import sheet from '@/components/today/sheet.module.css'
import styles from './dayPanel.module.css'

function toParam(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function excerpt(text, max = 110) {
  const flat = (text || '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}

function Contents({ date, day, loading, trackers, exercises, headingId }) {
  const { href } = useDemo()
  const isToday = toParam(date) === toParam(new Date())
  const logged = trackers.filter((t) => day?.totals[t.id] > 0)
  const missing = trackers.filter((t) => !(day?.totals[t.id] > 0))
  const hit = trackers.filter((t) => (day?.totals[t.id] || 0) >= t.target_value).length

  // Sets grouped by exercise, in the order they were done
  const lifts = []
  for (const s of day?.sets || []) {
    let row = lifts.find((l) => l.id === s.exercise_id)
    if (!row) {
      row = { id: s.exercise_id, name: exercises[s.exercise_id]?.name || 'Exercise', group: exercises[s.exercise_id]?.group, sets: [] }
      lifts.push(row)
    }
    row.sets.push(s)
  }
  const groups = [...new Set(lifts.map((l) => l.group).filter(Boolean))]
  const dayHref = href(isToday ? '/dashboard' : `/dashboard?date=${toParam(date)}`)
  const empty = !loading && !day

  return (
    <>
      <header className={styles.head}>
        <h2 id={headingId} className={styles.title}>
          {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}
          <span>{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })}</span>
        </h2>
        {!loading && day?.logs.length > 0 && trackers.length > 0 && (
          <p className={styles.score} data-perfect={hit === trackers.length || undefined}>
            {hit === trackers.length && <Check size={14} strokeWidth={3} aria-hidden="true" />}
            <span className="tnum">{`${hit} of ${trackers.length} goals`}</span>
          </p>
        )}
      </header>

      {loading ? (
        <div className={styles.loading} aria-busy="true" aria-label="Loading the day">
          {[0, 1, 2].map((i) => <Skeleton key={i} height="64px" radius="12px" />)}
        </div>
      ) : empty ? (
        <div className={styles.empty}>
          <p className="muted">Nothing logged on this day.</p>
        </div>
      ) : (
        <div className={styles.sections}>
          {logged.length > 0 && (
            <section aria-label="Trackers">
              <ul className={styles.trackers}>
                {logged.map((t, i) => {
                  const total = day.totals[t.id]
                  const pct = Math.min(1, total / t.target_value)
                  const done = total >= t.target_value
                  const entries = day.logs.filter((l) => l.tracker_id === t.id)
                  return (
                    <li key={t.id} className={styles.tracker} style={{ '--hue': getTrackerColor(t), animationDelay: `${i * 50}ms` }}>
                      <div className={styles.trackerHead}>
                        <span className={styles.icon}>{createElement(getTrackerIcon(t.name), { size: 16, 'aria-hidden': true })}</span>
                        <span className={styles.name}>{t.name}</span>
                        <span className={`${styles.total} tnum`}>
                          <b>{fmt(total)}</b> / {fmt(t.target_value)} {t.unit}
                        </span>
                        {done && <Check size={15} strokeWidth={3} className={styles.done} aria-label="Goal hit" />}
                      </div>
                      <div className={styles.bar} aria-hidden="true"><i style={{ transform: `scaleX(${pct})` }} /></div>
                      <ul className={styles.entries} aria-label={`${t.name} entries`}>
                        {entries.map((e) => (
                          <li key={e.id} className="tnum"><span className="faint">{timeOf(e.logged_at)}</span>+{fmt(e.value)} {t.unit}</li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
              </ul>
              {missing.length > 0 && day?.logs.length > 0 && (
                <p className={styles.missing}>Not logged: {missing.map((t) => t.name).join(', ')}</p>
              )}
            </section>
          )}

          {lifts.length > 0 && (
            <section aria-labelledby={`${headingId}-train`} className={styles.block}>
              <h3 id={`${headingId}-train`} className={styles.blockTitle}>
                <Dumbbell size={15} aria-hidden="true" />Training{groups.length > 0 && <span className="faint">{groups.join(', ')}</span>}
              </h3>
              <ul className={styles.lifts}>
                {lifts.map((l) => (
                  <li key={l.id}>
                    <span className={styles.liftName}>{l.name}</span>
                    <span className="tnum faint">
                      {l.sets.map((s) => `${s.sets} × ${s.reps}${s.weight ? ` @ ${kg(s.weight)}` : ''}`).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {day?.notes.length > 0 && (
            <section aria-labelledby={`${headingId}-notes`} className={styles.block}>
              <h3 id={`${headingId}-notes`} className={styles.blockTitle}><NotebookPen size={15} aria-hidden="true" />Notes</h3>
              <ul className={styles.notes}>
                {day.notes.map((n) => (
                  <li key={n.id}>
                    <Link href={href(`/notes?id=${n.id}`)} className={styles.note}>
                      <b>{n.title || 'Untitled'}</b>
                      {n.content && <span className="faint">{excerpt(n.content)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className={styles.foot}>
        <Link href={dayHref} className="btn btn-secondary btn-sm">
          {isToday ? 'Open Today' : empty ? 'Log something for this day' : 'Open this day'}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </>
  )
}

// A day's logs, workouts and notes. `inline` sits beside the calendar on wide
// screens; `sheet` is a panel from the right, or a bottom sheet on phones.
export default function DayPanel({ mode, onClose, ...props }) {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)
  const headingId = `day-${toParam(props.date)}`

  useEffect(() => {
    if (mode !== 'sheet') return
    ref.current.showModal()
    ref.current.querySelector('[data-autofocus]')?.focus()
  }, [mode])

  function close() {
    if (closing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onClose()
    setClosing(true)
    setTimeout(onClose, 220)
  }

  if (mode === 'inline') {
    return (
      <div className={styles.inline} aria-labelledby={headingId}>
        <Contents {...props} headingId={headingId} />
      </div>
    )
  }

  return (
    <dialog
      ref={ref}
      className={sheet.sheet}
      data-closing={closing || undefined}
      aria-labelledby={headingId}
      onCancel={(e) => { e.preventDefault(); close() }}
      onClick={(e) => { if (e.target === ref.current) close() }}
    >
      <div className={sheet.inner}>
        <div className={sheet.grabber} aria-hidden="true" />
        <div className={styles.sheetBody}>
          <button type="button" className={`icon-btn ${styles.close}`} onClick={close} aria-label="Close" data-autofocus>
            <X size={18} aria-hidden="true" />
          </button>
          <Contents {...props} headingId={headingId} />
        </div>
      </div>
    </dialog>
  )
}
