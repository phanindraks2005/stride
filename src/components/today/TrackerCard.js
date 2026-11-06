'use client'
import { createElement, useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, Keyboard, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import WaveFill from '@/components/WaveFill'
import Burst from '@/components/Burst'
import CountUp from '@/components/CountUp'
import { getTrackerColor, getTrackerIcon, getQuickSteps } from '@/lib/trackerIcons'
import { fmt, percentOf, timeOf } from './format'
import styles from './tracker.module.css'

const LONG_PRESS_MS = 520
const SWIPE_OPEN = 148

function Menu({ onEdit, onDelete, name }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={styles.menuWrap}>
      <button type="button" className="icon-btn" aria-label={`${name} options`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }}>
            <Pencil size={15} aria-hidden="true" />Edit tracker
          </button>
          <button type="button" role="menuitem" className={styles.menuDanger} onClick={() => { setOpen(false); onDelete() }}>
            <Trash2 size={15} aria-hidden="true" />Delete
          </button>
        </div>
      )}
    </div>
  )
}

// A quick-add button that answers the press: it sinks, a ripple spreads from the
// finger, and the amount floats up out of it.
function QuickAdd({ step, unit, name, disabled, onPress }) {
  const [ripples, setRipples] = useState([])
  const nextId = useRef(0)

  function press(e) {
    if (disabled) return
    const box = e.currentTarget.getBoundingClientRect()
    const id = nextId.current++
    const x = e.clientX ? e.clientX - box.left : box.width / 2
    const y = e.clientY ? e.clientY - box.top : box.height / 2
    setRipples((r) => [...r, { id, x, y }])
    setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 900)
    if (e.pointerType === 'touch') navigator.vibrate?.(8)
    onPress(step)
  }

  return (
    <button
      type="button"
      className={styles.quick}
      disabled={disabled}
      onClick={press}
      aria-label={`Add ${fmt(step)} ${unit} to ${name}`}
    >
      <span className={styles.rippleBox} aria-hidden="true">
        {ripples.map((r) => <i key={r.id} className={styles.ripple} style={{ left: r.x, top: r.y }} />)}
      </span>
      <span className={styles.quickLabel}>+{fmt(step)}<small>{unit}</small></span>
      {ripples.map((r) => <b key={r.id} className={styles.floatUp} style={{ left: r.x }} aria-hidden="true">+{fmt(step)}</b>)}
    </button>
  )
}

// Swipe left to reveal Edit/Delete, or hold, on touch screens
function useTouchGestures({ enabled, onLongPress }) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const g = useRef(null)

  function down(e) {
    if (!enabled || e.pointerType !== 'touch') return
    const onControl = e.target.closest('button, input, a, label')
    g.current = { x: e.clientX, y: e.clientY, base: offset, swiping: false, moved: false }
    if (!onControl) {
      g.current.timer = setTimeout(() => {
        if (!g.current || g.current.moved) return
        navigator.vibrate?.(12)
        g.current = null
        setOffset(0)
        onLongPress()
      }, LONG_PRESS_MS)
    }
  }

  function move(e) {
    const s = g.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      s.moved = true
      clearTimeout(s.timer)
    }
    if (!s.swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      s.swiping = true
      setDragging(true)
    }
    if (s.swiping) setOffset(Math.max(-SWIPE_OPEN - 24, Math.min(0, s.base + dx)))
  }

  function up() {
    const s = g.current
    if (!s) return
    clearTimeout(s.timer)
    if (s.swiping) setOffset((o) => (o < -SWIPE_OPEN / 2 ? -SWIPE_OPEN : 0))
    setDragging(false)
    g.current = null
  }

  // While the actions are showing, a tap on the card just closes them
  function clickCapture(e) {
    if (!offset || e.target.closest('[data-swipe-actions]')) return
    e.preventDefault()
    e.stopPropagation()
    setOffset(0)
  }

  return { offset, dragging, close: () => setOffset(0), handlers: { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onClickCapture: clickCapture } }
}

export default function TrackerCard({
  tracker, total = 0, index = 0, readOnly = false, compact = false,
  entryCount, lastAt, onOpen, onLog,
}) {
  const [amount, setAmount] = useState('')
  const [typing, setTyping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const color = getTrackerColor(tracker)
  const pct = percentOf(total, tracker.target_value)
  const done = pct >= 100
  const numRef = useRef(null)
  const inputRef = useRef(null)
  const gestures = useTouchGestures({ enabled: !readOnly && !!onOpen, onLongPress: () => onOpen('edit') })

  // A burst when this card crosses its target (not when it loads already done)
  const [prevPct, setPrevPct] = useState(pct)
  const [bursts, setBursts] = useState(0)
  if (pct !== prevPct) {
    setPrevPct(pct)
    if (prevPct < 100 && pct >= 100) setBursts(bursts + 1)
  }

  // The number gives a small kick each time the total changes
  const firstTotal = useRef(total)
  useEffect(() => {
    if (total === firstTotal.current || !numRef.current?.animate) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    numRef.current.animate([{ transform: 'scale(1.08) translateY(-3px)', color: 'var(--volt)' }, { transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' })
  }, [total])

  useEffect(() => { if (typing) inputRef.current?.focus() }, [typing])

  const steps = getQuickSteps(tracker.unit)
  const inputId = `log-${tracker.id}`

  async function log(value) {
    if (busy || readOnly) return
    const n = parseFloat(value)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter an amount above 0.')
      return
    }
    if (n > 1000000) {
      setError('That amount is too large.')
      return
    }
    setBusy(true)
    setError('')
    const result = await onLog(n)
    setBusy(false)
    if (result?.error) setError(result.error)
    else {
      setAmount('')
      setTyping(false)
    }
  }

  const left = Math.max(0, tracker.target_value - total)

  return (
    <article
      className={`${styles.wrap} ${compact ? styles.compact : ''}`}
      style={{ '--hue': color, '--glow': color, animationDelay: `${index * 70}ms` }}
      aria-labelledby={`tracker-${tracker.id}`}
    >
      {!readOnly && onOpen && (
        <div className={styles.swipeActions} data-swipe-actions aria-hidden={gestures.offset === 0}>
          <button type="button" tabIndex={gestures.offset ? 0 : -1} onClick={() => { gestures.close(); onOpen('edit') }}>
            <Pencil size={18} aria-hidden="true" />Edit
          </button>
          <button type="button" tabIndex={gestures.offset ? 0 : -1} className={styles.swipeDelete} onClick={() => { gestures.close(); onOpen('delete') }}>
            <Trash2 size={18} aria-hidden="true" />Delete
          </button>
        </div>
      )}

      <div
        className={`surface tint ${compact ? '' : 'lift'} ${styles.card}`}
        data-done={done || undefined}
        data-dragging={gestures.dragging || undefined}
        data-spotlight={compact ? undefined : ''}
        style={{ transform: gestures.offset ? `translateX(${gestures.offset}px)` : undefined }}
        {...gestures.handlers}
      >
        {bursts > 0 && (
          <span key={bursts} className={styles.celebrate} aria-hidden="true">
            <Burst x="50%" y="42%" count={14} />
            <i className={styles.ring} />
          </span>
        )}

        <div className={styles.head}>
          <h3 id={`tracker-${tracker.id}`} className={styles.name}>
            <span className={styles.icon}>{createElement(getTrackerIcon(tracker.name), { size: compact ? 14 : 17, color, 'aria-hidden': true })}</span>
            <span className={styles.nameText}>{tracker.name}</span>
          </h3>
          <div className={styles.headRight}>
            {done ? (
              <span className={styles.doneChip}><Check size={13} strokeWidth={3.5} aria-hidden="true" />Done</span>
            ) : (
              <span className={`${styles.pct} tnum`}>{pct}%</span>
            )}
            {!readOnly && onOpen && <Menu name={tracker.name} onEdit={() => onOpen('edit')} onDelete={() => onOpen('delete')} />}
          </div>
        </div>

        <div className={styles.vessel}>
          <WaveFill percent={pct} color={color} speed={5 + (tracker.id % 4) * 1.3} />
          <div className={styles.reading}>
            <p className={styles.total}>
              {/* Shows its total at once; ticks when a log changes it */}
              <span className="num" ref={numRef}><CountUp value={total} from={total} /></span>
              <span className={styles.unit}>{tracker.unit}</span>
            </p>
            <p className={styles.goal}>
              {done ? <>Goal of {fmt(tracker.target_value)} reached</> : <><span className="tnum">{fmt(left)}</span> to go of {fmt(tracker.target_value)}</>}
            </p>
          </div>
          <span className={styles.scale} aria-hidden="true"><i /><i /><i /></span>
        </div>

        {!readOnly && (
          typing ? (
            <form className={styles.typeRow} onSubmit={(e) => { e.preventDefault(); log(amount) }}>
              <label htmlFor={inputId} className="sr-only">Amount of {tracker.name} in {tracker.unit}</label>
              <input
                id={inputId}
                ref={inputRef}
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder={`Amount in ${tracker.unit}`}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setTyping(false); setError('') } }}
              />
              <button type="submit" className="btn btn-primary" disabled={busy || !amount}>{busy ? 'Saving' : 'Log'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setTyping(false); setError('') }}>Cancel</button>
            </form>
          ) : (
            <div className={styles.quickRow}>
              {steps.map((s) => (
                <QuickAdd key={s} step={s} unit={tracker.unit} name={tracker.name} disabled={busy} onPress={log} />
              ))}
              <button type="button" className={styles.typeBtn} onClick={() => setTyping(true)} aria-label={`Type an amount for ${tracker.name}`}>
                <Keyboard size={18} aria-hidden="true" />
              </button>
            </div>
          )
        )}
        {error && <p className="error-text" role="alert">{error}</p>}

        {onOpen && entryCount !== undefined && (
          <button type="button" className={styles.foot} onClick={() => onOpen('entries')}>
            <span>
              {entryCount === 0 ? 'Nothing logged yet' : `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`}
              {lastAt && <span className="faint"> · last at {timeOf(lastAt)}</span>}
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  )
}
