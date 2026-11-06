'use client'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDemo } from '@/lib/useDemo'
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, NotebookPen, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTrackerColor } from '@/lib/trackerIcons'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useMounted } from '@/lib/useMounted'
import Skeleton from '@/components/Skeleton'
import DayPanel from '@/components/calendar/DayPanel'
import EmptyState from '@/components/EmptyState'
import styles from './calendar.module.css'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_DOTS = 6
// One formatter for every cell's label (building one per call is slow)
const DAY_LABEL = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateKey(date) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

function parseMonth(param) {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) return null
  const [y, m] = param.split('-').map(Number)
  if (m < 1 || m > 12) return null
  return new Date(y, m - 1, 1)
}

function parseDay(param) {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return null
  const [y, m, d] = param.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getMonth() === m - 1 ? date : null
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

// Supabase returns at most 1,000 rows per request
async function fetchAll(makeQuery) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await makeQuery().range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

// One month of logs, sets and notes, bucketed by day of the month
async function fetchMonth(uid, month) {
  const from = month.toISOString()
  const to = addMonths(month, 1).toISOString()
  const [logs, sets, notes] = await Promise.all([
    fetchAll(() => supabase.from('logs').select('id, tracker_id, value, logged_at').eq('user_id', uid).gte('logged_at', from).lt('logged_at', to).order('logged_at')),
    fetchAll(() => supabase.from('exercise_logs').select('id, exercise_id, sets, reps, weight, logged_at').eq('user_id', uid).gte('logged_at', from).lt('logged_at', to).order('logged_at')),
    fetchAll(() => supabase.from('notes').select('id, title, content, created_at').eq('user_id', uid).gte('created_at', from).lt('created_at', to).order('created_at')),
  ])
  const days = {}
  const bucket = (iso) => {
    const d = new Date(iso).getDate()
    days[d] ??= { totals: {}, logs: [], sets: [], notes: [] }
    return days[d]
  }
  for (const log of logs) {
    const b = bucket(log.logged_at)
    b.totals[log.tracker_id] = (b.totals[log.tracker_id] || 0) + log.value
    b.logs.push(log)
  }
  for (const set of sets) bucket(set.logged_at).sets.push(set)
  for (const note of notes) bucket(note.created_at).notes.push(note)
  return days
}

function LoadingState() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading your calendar">
      <Skeleton width="240px" height="40px" />
      <Skeleton height="560px" radius="16px" />
    </div>
  )
}

function CalendarView() {
  const router = useRouter()
  const { href } = useDemo()
  const params = useSearchParams()
  const wide = useMediaQuery('(min-width: 1180px)')
  const today = new Date()
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const month = parseMonth(params.get('m'))
  const shown = month && month <= thisMonth ? month : thisMonth
  const key = monthKey(shown)

  const [status, setStatus] = useState('loading')
  const [uid, setUid] = useState(null)
  const [trackers, setTrackers] = useState([])
  const [exercises, setExercises] = useState({})
  const [months, setMonths] = useState({})
  const [monthError, setMonthError] = useState('')
  const [dir, setDir] = useState(0)
  const [hidden, setHidden] = useState(() => new Set())
  const [selected, setSelected] = useState(() => parseDay(params.get('d')))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [focusDay, setFocusDay] = useState(null)
  const loading = useRef(new Set())
  const gridRef = useRef(null)
  const touch = useRef(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    const id = session.user.id
    setUid(id)
    const [trackerRes, exRes, groupRes] = await Promise.all([
      supabase.from('trackers').select('*').eq('user_id', id).order('id'),
      supabase.from('exercises').select('id, name, muscle_group_id').eq('user_id', id),
      supabase.from('muscle_groups').select('id, name').eq('user_id', id),
    ])
    if (trackerRes.error || exRes.error || groupRes.error) {
      setStatus('error')
      return
    }
    const groupName = Object.fromEntries(groupRes.data.map((g) => [g.id, g.name]))
    setTrackers(trackerRes.data)
    setExercises(Object.fromEntries(exRes.data.map((e) => [e.id, { name: e.name, group: groupName[e.muscle_group_id] }])))
    setStatus('ready')
  }, [router])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const loadMonth = useCallback(async (m) => {
    const k = monthKey(m)
    if (loading.current.has(k)) return
    loading.current.add(k)
    try {
      const days = await fetchMonth(uid, m)
      setMonths((prev) => ({ ...prev, [k]: days }))
      setMonthError('')
    } catch {
      loading.current.delete(k)
      setMonthError("Couldn't load this month. Check your connection and try again.")
    }
  }, [uid])

  // The shown month, then the one before it so going back is instant
  useEffect(() => {
    if (status !== 'ready' || !uid) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMonth(shown).then(() => loadMonth(addMonths(shown, -1)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, uid, key, loadMonth])

  const setUrl = useCallback((m, d) => {
    const next = new URLSearchParams()
    if (monthKey(m) !== monthKey(thisMonth)) next.set('m', monthKey(m))
    if (d) next.set('d', dateKey(d))
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  function goMonth(n, focus) {
    const next = addMonths(shown, n)
    if (next > thisMonth) return
    setDir(n)
    setUrl(next, null)
    if (focus) setFocusDay(focus)
  }

  function pick(date) {
    setSelected(date)
    setFocusDay(date)
    setUrl(shown, date)
    if (!wide) setSheetOpen(true)
  }

  // Move keyboard focus to the day it was sent to, after the month renders
  useEffect(() => {
    if (!focusDay || monthKey(focusDay) !== key) return
    gridRef.current?.querySelector(`[data-day="${dateKey(focusDay)}"]`)?.focus()
  }, [focusDay, key, months])

  function onKeyDown(e) {
    const current = parseDay(e.target.dataset?.day)
    if (!current) return
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let next = null
    if (moves[e.key]) next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + moves[e.key])
    else if (e.key === 'Home') next = new Date(current.getFullYear(), current.getMonth(), current.getDate() - ((current.getDay() + 6) % 7))
    else if (e.key === 'End') next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + (6 - ((current.getDay() + 6) % 7)))
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const n = e.key === 'PageUp' ? -1 : 1
      next = new Date(current.getFullYear(), current.getMonth() + n, Math.min(current.getDate(), 28))
    }
    if (!next) return
    e.preventDefault()
    if (next > today) next = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const n = (next.getFullYear() - shown.getFullYear()) * 12 + next.getMonth() - shown.getMonth()
    if (n !== 0) goMonth(n, next)
    else setFocusDay(next)
  }

  // Swipe left or right on phones to change month
  function onTouchStart(e) {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e) {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 60 && Math.abs(dy) < 40) goMonth(dx < 0 ? 1 : -1)
  }

  function toggleTracker(id) {
    const next = new Set(hidden)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setHidden(next)
  }

  const days = months[key]
  const visible = trackers.filter((t) => !hidden.has(t.id))

  const summary = useMemo(() => {
    if (!days) return null
    let logged = 0
    let goals = 0
    let perfect = 0
    let training = 0
    for (const d of Object.values(days)) {
      if (d.logs.length) logged++
      if (d.sets.length) training++
      const hit = trackers.filter((t) => (d.totals[t.id] || 0) >= t.target_value).length
      goals += hit
      if (trackers.length && hit === trackers.length) perfect++
    }
    return { logged, goals, perfect, training }
  }, [days, trackers])

  if (status === 'loading') return <LoadingState />
  if (status === 'error') {
    return (
      <div className={styles.page}>
        <div className={`surface ${styles.message}`} role="alert">
          <h1 className={styles.messageTitle}>Couldn&apos;t load your calendar</h1>
          <p className="muted">Your data is safe. This is usually the connection.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load() }}>Try again</button>
        </div>
      </div>
    )
  }

  // Monday-first grid, padded to whole weeks
  const first = shown
  const lead = (first.getDay() + 6) % 7
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)),
  ]
  while (cells.length % 7) cells.push(null)

  const todayKey = dateKey(today)
  const selectedInMonth = selected && monthKey(selected) === key ? selected : null
  // The panel beside the grid always shows a day: the picked one, else today, else the 1st
  const panelDay = selectedInMonth || (key === monthKey(today) ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : first)
  // Only one day is in the tab order: the focused one, else the picked one, else today
  const tabKey = dateKey(focusDay && monthKey(focusDay) === key ? focusDay : panelDay)
  const monthLabel = shown.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const isThisMonth = key === monthKey(thisMonth)

  const panel = (date, mode) => (
    <DayPanel
      key={`${mode}-${dateKey(date)}`}
      mode={mode}
      date={date}
      day={days?.[date.getDate()]}
      loading={!days}
      trackers={trackers}
      exercises={exercises}
      onClose={() => setSheetOpen(false)}
    />
  )

  return (
    <div className={styles.page}>
      <header className={`feature ${styles.header}`} style={{ '--g1': 'var(--a-teal)', '--g2': 'var(--t-water)' }}>
        <div>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle} aria-live="polite">
            {summary
              ? summary.logged
                ? <>{summary.logged} {summary.logged === 1 ? 'day' : 'days'} logged<span aria-hidden="true"> · </span>{summary.goals} goals hit{summary.perfect > 0 && <><span aria-hidden="true"> · </span>{summary.perfect} perfect {summary.perfect === 1 ? 'day' : 'days'}</>}</>
                : 'Nothing logged this month.'
              : 'Loading the month…'}
          </p>
        </div>
        <div className={styles.monthNav}>
          <button type="button" className="icon-btn" onClick={() => goMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <h2 className={styles.monthLabel} aria-live="polite">{monthLabel}</h2>
          <button type="button" className="icon-btn" onClick={() => goMonth(1)} disabled={isThisMonth} aria-label="Next month">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          {!isThisMonth && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDir(1); setUrl(thisMonth, null) }}>This month</button>
          )}
        </div>
      </header>

      {trackers.length > 0 && (
        <div className={styles.legend} role="group" aria-label="Show trackers">
          {trackers.map((t) => (
            <button
              key={t.id}
              type="button"
              className={styles.legendChip}
              style={{ '--hue': getTrackerColor(t) }}
              aria-pressed={!hidden.has(t.id)}
              onClick={() => toggleTracker(t.id)}
            >
              <i aria-hidden="true" />{t.name}
            </button>
          ))}
          <p className={styles.key}>
            <span><i className={styles.keyHit} aria-hidden="true" />Goal hit</span>
            <span><i className={styles.keyPart} aria-hidden="true" />Logged</span>
            <span className={styles.keyTrained}><Dumbbell size={13} aria-hidden="true" />Trained</span>
          </p>
        </div>
      )}

      {summary && summary.logged === 0 && (
        <EmptyState
          id="month-empty"
          icon={<CalendarDays size={24} />}
          title={isThisMonth ? 'A fresh month' : `Nothing logged in ${shown.toLocaleDateString('en-US', { month: 'long' })}`}
          hues={['var(--a-teal)', 'var(--t-water)']}
          art={(
            <div className={styles.emptyArt}>
              {Array.from({ length: 21 }, (_, i) => (
                <i key={i} style={{ animationDelay: `${i * 25}ms` }}>
                  {[0, 1, 2].slice(0, (i * 7) % 4).map((d) => <b key={d} style={{ background: ['var(--t-water)', 'var(--t-sleep)', 'var(--t-protein)'][d] }} />)}
                </i>
              ))}
            </div>
          )}
          action={isThisMonth && <Link href={href('/dashboard')} className="btn btn-primary btn-lg"><Plus size={18} aria-hidden="true" />Log something today</Link>}
        >
          <p>{isThisMonth ? 'Every day you log gets a dot per tracker in its colour, filled when the goal is hit. Tap a day to see everything you logged.' : 'Days you log show a dot per tracker here. Pick another month, or log something today.'}</p>
        </EmptyState>
      )}

      {monthError && (
        <p className="error-text" role="alert">
          {monthError}{' '}
          <button type="button" className={styles.retry} onClick={() => loadMonth(shown)}>Try again</button>
        </p>
      )}

      <div className={styles.layout}>
        <section className={`surface ${styles.calendar}`} aria-label={monthLabel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className={styles.weekdays} aria-hidden="true">
            {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div
            key={key}
            ref={gridRef}
            className={styles.grid}
            data-dir={dir > 0 ? 'next' : dir < 0 ? 'prev' : undefined}
            role="grid"
            aria-busy={!days || undefined}
            onKeyDown={onKeyDown}
          >
            {Array.from({ length: cells.length / 7 }, (_, w) => (
              <div key={w} role="row" className={styles.week}>
                {cells.slice(w * 7, w * 7 + 7).map((date, i) => {
                  if (!date) return <span key={i} role="gridcell" className={styles.pad}><span /></span>
                  const k = dateKey(date)
                  const d = days?.[date.getDate()]
                  const future = date > today
                  const logged = visible.filter((t) => d?.totals[t.id] > 0)
                  const hit = trackers.filter((t) => (d?.totals[t.id] || 0) >= t.target_value).length
                  const perfect = trackers.length > 0 && hit === trackers.length
                  const label = [
                    DAY_LABEL.format(date),
                    future ? 'upcoming' : d?.logs.length ? `${hit} of ${trackers.length} goals hit` : 'nothing logged',
                    d?.sets.length ? 'trained' : null,
                    d?.notes.length ? `${d.notes.length} ${d.notes.length === 1 ? 'note' : 'notes'}` : null,
                  ].filter(Boolean).join(', ')
                  return (
                    <span key={k} role="gridcell" aria-selected={panelDay && k === dateKey(panelDay) && (wide || sheetOpen) ? true : undefined}>
                      <button
                        type="button"
                        className={styles.day}
                        data-day={k}
                        data-today={k === todayKey || undefined}
                        data-selected={(wide && k === dateKey(panelDay)) || (!wide && sheetOpen && k === dateKey(panelDay)) || undefined}
                        data-perfect={perfect || undefined}
                        disabled={future}
                        tabIndex={k === tabKey ? 0 : -1}
                        aria-label={label}
                        onClick={() => pick(date)}
                      >
                        <span className={styles.dayNum}>{date.getDate()}</span>
                        <span className={styles.marks} aria-hidden="true">
                          {d?.sets.length > 0 && <Dumbbell size={12} className={styles.trained} />}
                          {d?.notes.length > 0 && <NotebookPen size={12} className={styles.noted} />}
                        </span>
                        <span className={styles.dots} aria-hidden="true">
                          {logged.slice(0, MAX_DOTS).map((t) => (
                            <i
                              key={t.id}
                              style={{ '--hue': getTrackerColor(t) }}
                              data-hit={d.totals[t.id] >= t.target_value || undefined}
                            />
                          ))}
                          {logged.length > MAX_DOTS && <b>+{logged.length - MAX_DOTS}</b>}
                        </span>
                      </button>
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {wide && <aside className={`surface ${styles.aside}`} aria-label="Day details">{panel(panelDay, 'inline')}</aside>}
      </div>

      {!wide && sheetOpen && selectedInMonth && panel(selectedInMonth, 'sheet')}
    </div>
  )
}

export default function Calendar() {
  // Dates come from the visitor's clock, so render on the client only
  const mounted = useMounted()
  return (
    <Suspense fallback={<LoadingState />}>
      {mounted ? <CalendarView /> : <LoadingState />}
    </Suspense>
  )
}
