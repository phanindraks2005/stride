'use client'
import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import styles from '@/app/(app)/fitness/fitness.module.css'

const PRESETS = [60, 90, 120, 180]

function clock(s) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

// Rest between sets. Starts by itself whenever `startKey` changes (after a log),
// counts down by the wall clock (so a backgrounded tab stays right), buzzes at zero.
export default function RestTimer({ startKey }) {
  const [duration, setDuration] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('stride-rest'))
      return PRESETS.includes(saved) ? saved : 90
    } catch {
      return 90
    }
  })
  const [endsAt, setEndsAt] = useState(null)
  const [pausedLeft, setPausedLeft] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [done, setDone] = useState(false)
  const firstKey = useRef(startKey)

  function start(seconds = duration) {
    setDone(false)
    setPausedLeft(null)
    setNow(Date.now())
    setEndsAt(Date.now() + seconds * 1000)
  }

  useEffect(() => {
    if (startKey === firstKey.current) return
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey])

  useEffect(() => {
    if (!endsAt) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endsAt) {
        clearInterval(id)
        setEndsAt(null)
        setDone(true)
        navigator.vibrate?.([180, 90, 180])
      }
    }, 250)
    return () => clearInterval(id)
  }, [endsAt])

  function pick(seconds) {
    setDuration(seconds)
    try { localStorage.setItem('stride-rest', String(seconds)) } catch { /* storage blocked */ }
    if (endsAt) start(seconds)
  }

  const running = !!endsAt
  const left = running ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : pausedLeft ?? (done ? 0 : duration)
  const fraction = running || pausedLeft !== null ? left / duration : done ? 0 : 1

  return (
    <section className={`surface tint ${styles.timer}`} data-done={done || undefined} aria-labelledby="rest-title">
      <div className={styles.timerRing}>
        <svg viewBox="0 0 104 104" aria-hidden="true">
          <circle cx="52" cy="52" r="46" pathLength="1" />
          <circle cx="52" cy="52" r="46" pathLength="1" style={{ strokeDashoffset: 1 - fraction }} />
        </svg>
        <span className={styles.timerTime} role="timer" aria-live="off">{clock(left)}</span>
      </div>
      <div className={styles.timerSide}>
        <div className={styles.timerTitle}>
          <h2 id="rest-title" className={styles.cardTitle}>Rest timer</h2>
          <span className="faint" aria-live="polite">{done ? 'Rest over. Next set.' : running ? 'Resting…' : 'Starts after each log'}</span>
        </div>
        <div className={styles.timerPresets} role="group" aria-label="Rest length">
          {PRESETS.map((s) => (
            <button key={s} type="button" className={styles.preset} aria-pressed={duration === s} onClick={() => pick(s)}>{clock(s)}</button>
          ))}
        </div>
        <div className={styles.timerActions}>
          {running ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setPausedLeft(left); setEndsAt(null) }}><Pause size={15} aria-hidden="true" />Pause</button>
          ) : pausedLeft !== null ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setNow(Date.now()); setEndsAt(Date.now() + pausedLeft * 1000); setPausedLeft(null) }}><Play size={15} aria-hidden="true" />Resume</button>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => start()}><Timer size={15} aria-hidden="true" />Start</button>
          )}
          {running && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEndsAt((e) => e + 15000)}>+15 s</button>}
          {(running || pausedLeft !== null || done) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEndsAt(null); setPausedLeft(null); setDone(false) }}><RotateCcw size={15} aria-hidden="true" />Reset</button>
          )}
        </div>
      </div>
    </section>
  )
}
