'use client'
import { useCallback, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getStreakStats } from '@/lib/streak'
import { getTrackerColor } from '@/lib/trackerIcons'
import { useDemo } from '@/lib/useDemo'
import Skeleton from '@/components/Skeleton'
import ProductTour from '@/components/ProductTour'
import StreakHero from '@/components/today/StreakHero'
import WeekCard from '@/components/today/WeekCard'
import LibraGlyph from '@/components/LibraGlyph'
import TrackerCard from '@/components/today/TrackerCard'
import TrackerSheet from '@/components/today/TrackerSheet'
import EmptyState from '@/components/EmptyState'
import styles from './dashboard.module.css'

const SUGGESTIONS = [
  { name: 'Water', unit: 'ml', target_value: 3000 },
  { name: 'Sleep', unit: 'hrs', target_value: 8 },
  { name: 'Protein', unit: 'g', target_value: 120 },
  { name: 'Steps', unit: 'steps', target_value: 8000 },
  { name: 'Reading', unit: 'mins', target_value: 30 },
  { name: 'Meditation', unit: 'mins', target_value: 10 },
]

function toDateParam(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "YYYY-MM-DD" as a local date (new Date('YYYY-MM-DD') would be UTC midnight)
function parseDateParam(param) {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return null
  const [y, m, d] = param.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

function dayRange(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return [start.toISOString(), end.toISOString()]
}

function greeting(name) {
  const h = new Date().getHours()
  const part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return name ? `${part}, ${name}.` : `${part}.`
}

// Databases set up before trackers had a colour have no `color` column yet;
// save without it there rather than fail.
async function withColor(values, run) {
  const result = await run(values)
  if (result.error?.code === 'PGRST204' && 'color' in values) {
    const { color, ...rest } = values
    return run(rest)
  }
  return result
}

function LoadingState() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading your day">
      <div className={styles.header}>
        <div>
          <Skeleton width="280px" height="36px" />
          <Skeleton width="200px" height="18px" style={{ marginTop: 12 }} />
        </div>
      </div>
      <div className={styles.top}>
        <Skeleton height="236px" radius="16px" />
        <Skeleton height="236px" radius="16px" />
      </div>
      <div className={styles.grid}>
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height="250px" radius="16px" />)}
      </div>
    </div>
  )
}

function DashboardForDate() {
  // A fresh instance per day, so open entries and forms don't carry over
  const dateParam = useSearchParams().get('date')
  return <DashboardContent key={dateParam || 'today'} dateParam={dateParam} />
}

function DashboardContent({ dateParam }) {
  const router = useRouter()
  const { isDemo, href } = useDemo()
  const viewDate = parseDateParam(dateParam)
  const todayParam = toDateParam(new Date())
  const isToday = !viewDate || toDateParam(viewDate) === todayParam
  const day = isToday ? new Date() : viewDate

  const [user, setUser] = useState(null)
  const [trackers, setTrackers] = useState([])
  const [totals, setTotals] = useState({})
  const [streak, setStreak] = useState({ current: 0, best: 0, chain: [], byDay: {} })
  const [profileName, setProfileName] = useState('')
  const [status, setStatus] = useState('loading')
  const [dayLogs, setDayLogs] = useState([])
  const [sheet, setSheet] = useState(null)
  const [showTour, setShowTour] = useState(false)

  const loadDay = useCallback(async (uid) => {
    const [from, to] = dayRange(day)
    const [trackerRes, logRes, stats] = await Promise.all([
      supabase.from('trackers').select('*').eq('user_id', uid).order('id'),
      supabase.from('logs').select('id, tracker_id, value, logged_at').eq('user_id', uid).gte('logged_at', from).lt('logged_at', to).order('logged_at', { ascending: false }),
      getStreakStats(uid),
    ])
    if (trackerRes.error) throw trackerRes.error
    if (logRes.error) throw logRes.error
    const sums = {}
    logRes.data.forEach((log) => { sums[log.tracker_id] = (sums[log.tracker_id] || 0) + log.value })
    setTrackers(trackerRes.data)
    setTotals(sums)
    setDayLogs(logRes.data)
    setStreak(stats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateParam])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    const uid = session.user.id
    setUser(session.user)
    try {
      const [{ data: profile }] = await Promise.all([
        supabase.from('profiles').select('name, has_seen_tour').eq('user_id', uid).maybeSingle(),
        loadDay(uid),
      ])
      setProfileName(profile?.name || '')
      if (profile && !profile.has_seen_tour) setShowTour(true)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [loadDay, router])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function refresh() {
    try {
      await loadDay(user.id)
    } catch {
      setStatus('error')
    }
  }

  // A past day gets the entry at the current time of day on that date
  function loggedAt() {
    if (isToday) return new Date().toISOString()
    const now = new Date()
    const at = new Date(viewDate)
    at.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
    return at.toISOString()
  }

  // The total moves the moment a button is pressed; the insert catches up behind it
  async function handleLog(tracker, value) {
    setTotals((t) => ({ ...t, [tracker.id]: (t[tracker.id] || 0) + value }))
    const { error } = await supabase.from('logs').insert({
      user_id: user.id,
      tracker_id: tracker.id,
      value,
      logged_at: loggedAt(),
    })
    if (error) {
      setTotals((t) => ({ ...t, [tracker.id]: (t[tracker.id] || 0) - value }))
      return { error: "Couldn't save that. Check your connection and try again." }
    }
    refresh()
  }

  async function handleDeleteEntry(entry) {
    const { error } = await supabase.from('logs').delete().eq('id', entry.id)
    if (!error) await refresh()
  }

  async function handleSave(tracker, values) {
    const { error } = await withColor(values, (v) => supabase.from('trackers').update(v).eq('id', tracker.id))
    if (error) return { error: "Couldn't save the tracker. Try again." }
    await refresh()
  }

  async function handleDelete(tracker) {
    // Logs go with the tracker (on delete cascade)
    const { error } = await supabase.from('trackers').delete().eq('id', tracker.id)
    if (error) return { error: "Couldn't delete the tracker. Try again." }
    await refresh()
  }

  async function handleCreate(values) {
    const { error } = await withColor(values, (v) => supabase.from('trackers').insert({ ...v, user_id: user.id, type: 'number' }))
    if (error) return { error: "Couldn't add the tracker. Try again." }
    await refresh()
  }

  function shiftDay(delta) {
    const next = new Date(day)
    next.setDate(next.getDate() + delta)
    const param = toDateParam(next)
    router.push(href(param === todayParam ? '/dashboard' : `/dashboard?date=${param}`))
  }

  if (status === 'loading') return <LoadingState />

  if (status === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.errorCard} role="alert">
          <h1 className={styles.errorTitle}>Couldn&apos;t load your day</h1>
          <p className="muted">Your data is safe. This is usually the connection; try again in a moment.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load() }}>Try again</button>
        </div>
      </div>
    )
  }

  const dateLabel = day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const doneCount = trackers.filter((t) => (totals[t.id] || 0) >= t.target_value).length
  const sheetTracker = sheet?.trackerId ? trackers.find((t) => t.id === sheet.trackerId) : null

  return (
    <>
      {showTour && <ProductTour onComplete={() => setShowTour(false)} />}
      {sheet && (sheet.mode === 'new' || sheetTracker) && (
        <TrackerSheet
          key={`${sheet.mode}-${sheet.trackerId || 'new'}`}
          mode={sheet.mode}
          readOnly={isDemo}
          tracker={sheetTracker}
          initial={sheet.initial}
          entries={sheetTracker ? dayLogs.filter((l) => l.tracker_id === sheetTracker.id) : undefined}
          dayLabel={isToday ? 'today' : `on ${day.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
          onClose={() => setSheet(null)}
          onSubmit={(values) => (sheetTracker ? handleSave(sheetTracker, values) : handleCreate(values))}
          onDelete={() => handleDelete(sheetTracker)}
          onDeleteEntry={handleDeleteEntry}
        />
      )}
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>{isToday ? 'Today' : dateLabel}</h1>
            <p className={styles.subtitle}>
              {isToday
                ? <>{dateLabel}<span aria-hidden="true"> · </span>{isDemo ? `${profileName}’s sample account` : greeting(profileName)}</>
                : isDemo ? 'Looking back at this day.' : 'Looking back. Anything you log here goes on this day.'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.dayNav}>
              <button type="button" className="icon-btn" onClick={() => shiftDay(-1)} aria-label="Previous day">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              {!isToday && <Link href={href('/dashboard')} className="btn btn-ghost btn-sm">Back to today</Link>}
              <button type="button" className="icon-btn" onClick={() => shiftDay(1)} disabled={isToday} aria-label="Next day">
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <Link href={href('/copilot')} className="btn btn-secondary btn-sm"><LibraGlyph size={18} />Ask Libra</Link>
            {isDemo ? (
              <Link href="/signup" className="btn btn-primary btn-sm">Start your own</Link>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSheet({ mode: 'new' })}>
                <Plus size={16} aria-hidden="true" />New tracker
              </button>
            )}
          </div>
        </header>

        {trackers.length === 0 ? (
          <EmptyState
            id="empty-title"
            icon={<Plus size={24} />}
            title="Make your first tracker"
            hues={['var(--volt)', 'var(--t-water)']}
            art={(
              <div className={styles.emptyArt}>
                {[['var(--t-water)', 72, 'Water'], ['var(--t-sleep)', 90, 'Sleep'], ['var(--t-protein)', 48, 'Protein']].map(([hue, pct, name]) => (
                  <span key={name} style={{ '--hue': hue, '--pct': `${pct}%` }}><i /><b>{name}</b></span>
                ))}
              </div>
            )}
            action={(
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setSheet({ mode: 'new' })}>
                <Plus size={18} aria-hidden="true" />Make my own
              </button>
            )}
          >
            <p>Anything with a number and a daily target. Start from one of these:</p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((sug) => (
                <button
                  key={sug.name}
                  type="button"
                  className={styles.suggestion}
                  style={{ '--hue': getTrackerColor(sug.name) }}
                  onClick={() => setSheet({ mode: 'new', initial: sug })}
                >
                  {sug.name}<span className="faint tnum">{sug.target_value.toLocaleString('en-US')} {sug.unit}</span>
                </button>
              ))}
            </div>
          </EmptyState>
        ) : (
          <>
            {trackers.length > 0 && (
              <div className={styles.top}>
                <StreakHero {...streak} trackerCount={trackers.length} />
                <WeekCard trackers={trackers} byDay={streak.byDay} />
              </div>
            )}

            <section aria-labelledby="trackers-title">
              <div className={styles.sectionHead}>
                <h2 id="trackers-title" className={styles.sectionTitle}>
                  Trackers<span className={styles.sectionCount}>{doneCount} of {trackers.length} done</span>
                </h2>
                {!isDemo && <p className={styles.gestureHint}>Hold a card to edit it, or swipe it left.</p>}
              </div>
              <div className={styles.grid}>
                {trackers.map((tracker, i) => {
                  const logs = dayLogs.filter((l) => l.tracker_id === tracker.id)
                  return (
                    <TrackerCard
                      key={tracker.id}
                      index={i}
                      tracker={tracker}
                      readOnly={isDemo}
                      total={totals[tracker.id] || 0}
                      entryCount={logs.length}
                      lastAt={logs[0]?.logged_at}
                      onOpen={(mode) => setSheet({ mode: isDemo ? 'entries' : mode, trackerId: tracker.id })}
                      onLog={(value) => handleLog(tracker, value)}
                    />
                  )
                })}
                {!isDemo && (
                  <button type="button" className={styles.addCard} onClick={() => setSheet({ mode: 'new' })}>
                    <span className={styles.addIcon}><Plus size={22} aria-hidden="true" /></span>
                    <span>Add a tracker</span>
                    <span className={styles.addHint}>Anything with a number and a daily goal</span>
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DashboardForDate />
    </Suspense>
  )
}
