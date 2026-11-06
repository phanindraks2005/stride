'use client'
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowDownRight, ArrowUpRight, Minus, Plus, Target, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDemo } from '@/lib/useDemo'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { getStreakStats } from '@/lib/streak'
import { PERIODS, mostMissed, periodInsight, periodStats, personalBest, series, summary } from '@/lib/progress'
import { getTrackerColor, getTrackerIcon } from '@/lib/trackerIcons'
import { fmt } from '@/components/today/format'
import CountUp from '@/components/CountUp'
import LibraGlyph from '@/components/LibraGlyph'
import Skeleton from '@/components/Skeleton'
import Heatmap from '@/components/today/Heatmap'
import EmptyState from '@/components/EmptyState'
import styles from './progress.module.css'

const TrendChart = dynamic(() => import('./TrendChart'))

function PeriodSwitch({ value, onChange }) {
  const keys = Object.keys(PERIODS)
  return (
    <div className={styles.switch} role="radiogroup" aria-label="Period" style={{ '--i': keys.indexOf(value), '--n': keys.length }}>
      <span className={styles.switchThumb} aria-hidden="true" />
      {keys.map((k) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}>
          {PERIODS[k].label}
        </button>
      ))}
    </div>
  )
}

function Change({ value, label }) {
  if (value === null) return <span className={styles.change} data-flat>{label ? 'Nothing to compare yet' : '—'}</span>
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus
  return (
    <span className={styles.change} data-up={value > 0 || undefined} data-down={value < 0 || undefined}>
      <Icon size={15} aria-hidden="true" /><span className="tnum">{Math.abs(value)}%</span>{label && <span className={styles.changeLabel}>{label}</span>}
    </span>
  )
}

// A ring of goal days with a sparkline under it, one per tracker
function TrackerTile({ tracker, s, points, selected, onSelect, index }) {
  const hue = getTrackerColor(tracker)
  const rate = s.days ? s.goalDays / s.days : 0
  const max = Math.max(...points.map((p) => p.value), tracker.target_value || 0) || 1
  const path = points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * 100},${30 - (p.value / max) * 28}`).join(' ')
  return (
    <button
      type="button"
      className={`surface tint lift ${styles.tile}`}
      style={{ '--hue': hue, animationDelay: `${index * 60}ms` }}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className={styles.tileHead}>
        <span className={styles.tileIcon}>{createElement(getTrackerIcon(tracker.name), { size: 15, color: hue, 'aria-hidden': true })}</span>
        <span className={styles.tileName}>{tracker.name}</span>
      </span>
      <span className={styles.ring} style={{ '--p': rate }} aria-hidden="true">
        <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" pathLength="1" /><circle cx="18" cy="18" r="15.5" pathLength="1" /></svg>
        <b className="tnum">{Math.round(rate * 100)}%</b>
      </span>
      <span className={styles.tileStat}><span className="tnum">{s.goalDays}/{s.days}</span> days on goal</span>
      <svg className={styles.spark} viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={path} />
      </svg>
    </button>
  )
}

function LoadingState() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading progress">
      <Skeleton width="220px" height="40px" />
      <Skeleton height="150px" radius="20px" />
      <div className={styles.main}>
        <Skeleton height="380px" radius="16px" />
        <Skeleton height="380px" radius="16px" />
      </div>
    </div>
  )
}

export default function Progress() {
  const router = useRouter()
  const { href } = useDemo()
  const reduced = useReducedMotion()
  const [status, setStatus] = useState('loading')
  const [trackers, setTrackers] = useState([])
  const [stats, setStats] = useState({ byDay: {}, current: 0, best: 0 })
  const [period, setPeriod] = useState('week')
  const [selectedId, setSelectedId] = useState(null)
  const [mapMode, setMapMode] = useState('tracker')
  const yearRef = useRef(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    const uid = session.user.id
    try {
      const [trackerRes, s] = await Promise.all([
        supabase.from('trackers').select('*').eq('user_id', uid).order('id'),
        getStreakStats(uid),
      ])
      if (trackerRes.error) throw trackerRes.error
      setTrackers(trackerRes.data)
      setStats(s)
      // ?period= and ?tracker= restore the view (see the effect below)
      const q = new URLSearchParams(window.location.search)
      if (['week', 'month', 'year'].includes(q.get('period'))) setPeriod(q.get('period'))
      const linked = trackerRes.data.find((t) => String(t.id) === q.get('tracker'))
      setSelectedId((id) => id ?? linked?.id ?? trackerRes.data[0]?.id ?? null)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [router])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  // Keep the view in the URL, so it can be shared and survives a reload
  useEffect(() => {
    if (status !== 'ready' || !selectedId) return
    const q = new URLSearchParams({ period, tracker: String(selectedId) })
    window.history.replaceState(null, '', `?${q}`)
  }, [status, period, selectedId])

  // The year map is wide: on phones, start it at today (the right-hand end)
  useEffect(() => {
    const el = yearRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [status])

  const tracker = trackers.find((t) => t.id === selectedId) || trackers[0]
  const derived = useMemo(() => {
    if (!tracker) return null
    const byDay = stats.byDay
    return {
      points: series(byDay, tracker, period),
      s: summary(byDay, tracker, period),
      best: personalBest(byDay, tracker),
      missed: mostMissed(byDay, trackers, period),
      overall: periodStats(byDay, trackers, period),
      insight: periodInsight(byDay, trackers, period),
      tiles: trackers.map((t) => ({ t, s: summary(byDay, t, period), points: series(byDay, t, period) })),
    }
  }, [stats, tracker, trackers, period])

  if (status === 'loading') return <LoadingState />

  if (status === 'error') {
    return (
      <div className={styles.page}>
        <div className={`surface ${styles.message}`} role="alert">
          <h1 className={styles.messageTitle}>Couldn&apos;t load your progress</h1>
          <p className="muted">Your data is safe. This is usually the connection.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load() }}>Try again</button>
        </div>
      </div>
    )
  }

  if (!tracker) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Progress</h1>
        <EmptyState
          id="progress-empty"
          icon={<Target size={24} />}
          title="Nothing to chart yet"
          hues={['var(--a-violet)', 'var(--t-sleep)']}
          art={(
            <div className={styles.emptyArt}>
              {[42, 58, 50, 74, 66, 88, 80].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} data-hit={h >= 66 || undefined} />)}
              <b>Goal</b>
            </div>
          )}
          action={<Link href={href('/dashboard')} className="btn btn-primary btn-lg"><Plus size={18} aria-hidden="true" />Make a tracker</Link>}
        >
          <p>Make a tracker on Today and log to it. Weekly charts, personal bests, goal rings and a year of history fill in here.</p>
        </EmptyState>
      </div>
    )
  }

  const { points, s, best, missed, overall, insight, tiles } = derived
  const hue = getTrackerColor(tracker)
  const p = PERIODS[period]
  const unitAvg = period === 'year' ? 'a day on average' : 'a day'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Progress</h1>
          <p className={styles.subtitle}>How {p.phrase} went, against {p.prev}.</p>
        </div>
        <PeriodSwitch value={period} onChange={setPeriod} />
      </header>

      <section className={`surface feature ${styles.hero}`} style={{ '--g1': 'var(--a-violet)', '--g2': '#c792ff' }} aria-label="Libra's read on this period">
        <div className={styles.heroText}>
          <LibraGlyph size={22} draw badge />
          <p key={period} className={styles.insight}>{insight}</p>
        </div>
        <dl className={styles.heroStats}>
          <div>
            <dt>Days logged</dt>
            <dd><span className="num"><CountUp value={overall.logged} /></span><span className={styles.of}>/ {overall.days}</span></dd>
          </div>
          <div>
            <dt>Goals hit</dt>
            <dd><span className="num"><CountUp value={overall.goals} /></span></dd>
          </div>
          <div>
            <dt>Current streak</dt>
            <dd className={styles.volt}><span className="num"><CountUp value={stats.current} /></span><span className={styles.of}>days</span></dd>
          </div>
        </dl>
      </section>

      <div className={styles.picker} role="tablist" aria-label="Tracker">
        {trackers.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tracker.id}
            className={styles.pick}
            style={{ '--hue': getTrackerColor(t) }}
            onClick={() => setSelectedId(t.id)}
          >
            <i aria-hidden="true" />{t.name}
          </button>
        ))}
      </div>

      <div className={styles.main}>
        <section className={`surface tint ${styles.chartCard}`} style={{ '--hue': hue }} aria-labelledby="chart-title">
          <div className={styles.chartHead}>
            <div>
              <h2 id="chart-title" className={styles.chartTitle}>
                <span className={styles.tileIcon}>{createElement(getTrackerIcon(tracker.name), { size: 16, color: hue, 'aria-hidden': true })}</span>
                {tracker.name}
              </h2>
              <p className={styles.chartBig}>
                <span className="num"><CountUp value={Math.round(s.avg * 10) / 10} /></span>
                <span className={styles.chartUnit}>{tracker.unit} {unitAvg}</span>
              </p>
            </div>
            <div className={styles.chartSide}>
              <Change value={s.change} label={`vs ${p.prev}`} />
              <span className="faint tnum">Goal {fmt(tracker.target_value)} {tracker.unit}</span>
            </div>
          </div>
          <div key={`${tracker.id}-${period}`} className={styles.chart} role="img"
            aria-label={`${tracker.name}, ${p.phrase}: ${points.map((pt) => `${pt.full} ${fmt(pt.value)}`).join(', ')}`}>
            <TrendChart tracker={tracker} data={points} period={period} reduced={reduced} />
          </div>
          {s.loggedDays === 0 && <p className={styles.chartEmpty}>Nothing logged to {tracker.name} in {p.phrase}.</p>}
        </section>

        <div className={styles.callouts}>
          <section className={`surface tint ${styles.callout}`} style={{ '--hue': hue }}>
            <span className={styles.calloutIcon} data-volt><Trophy size={18} aria-hidden="true" /></span>
            <div>
              <h2 className={styles.calloutLabel}>Personal best</h2>
              {best ? (
                <>
                  <p className={styles.calloutBig}><span className="num"><CountUp value={best.value} /></span> <span className={styles.chartUnit}>{tracker.unit}</span></p>
                  <p className={styles.calloutNote}>in one day, on {best.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </>
              ) : <p className={styles.calloutNote}>Log {tracker.name} once and your best day shows here.</p>}
            </div>
          </section>

          {missed && (
            <section className={`surface tint ${styles.callout}`} style={{ '--hue': getTrackerColor(missed.tracker) }}>
              <span className={styles.calloutIcon}><Target size={18} aria-hidden="true" /></span>
              <div>
                <h2 className={styles.calloutLabel}>Most missed</h2>
                <p className={styles.calloutBig}><span className={styles.hueText}>{missed.tracker.name}</span></p>
                <p className={styles.calloutNote}>
                  {missed.hit === missed.days ? `On goal every day of ${p.phrase}. Nothing missed.` : `Goal hit on ${missed.hit} of ${missed.days} days. Missed ${missed.days - missed.hit}.`}
                </p>
              </div>
            </section>
          )}

          <section className={`surface tint ${styles.callout}`} style={{ '--hue': hue }}>
            <span className={styles.calloutIcon}>{createElement(getTrackerIcon(tracker.name), { size: 18, 'aria-hidden': true })}</span>
            <div>
              <h2 className={styles.calloutLabel}>{tracker.name} consistency</h2>
              <p className={styles.calloutBig}><span className="num"><CountUp value={s.goalDays} /></span> <span className={styles.chartUnit}>of {s.days} days on goal</span></p>
              <div className={styles.meter} aria-hidden="true"><i style={{ transform: `scaleX(${s.days ? s.goalDays / s.days : 0})` }} /></div>
            </div>
          </section>
        </div>
      </div>

      <section aria-labelledby="all-title">
        <h2 id="all-title" className={styles.sectionTitle}>All trackers <span className="faint">{p.phrase}</span></h2>
        <div className={styles.tiles}>
          {tiles.map(({ t, s: ts, points: tp }, i) => (
            <TrackerTile key={t.id} index={i} tracker={t} s={ts} points={tp} selected={t.id === tracker.id} onSelect={() => setSelectedId(t.id)} />
          ))}
        </div>
      </section>

      <section className={`surface tint ${styles.year}`} aria-labelledby="year-title" style={{ '--hue': hue }}>
        <div className={styles.yearHead}>
          <div>
            <h2 id="year-title" className={styles.sectionTitle}>The last 12 months</h2>
            <p className={styles.subtitle}>{mapMode === 'tracker' ? `How close ${tracker.name} came to its goal each day.` : 'How many trackers you logged each day.'}</p>
          </div>
          <div className={styles.mapToggle} role="radiogroup" aria-label="Year view">
            <button type="button" role="radio" aria-checked={mapMode === 'tracker'} onClick={() => setMapMode('tracker')}>{tracker.name}</button>
            <button type="button" role="radio" aria-checked={mapMode === 'all'} onClick={() => setMapMode('all')}>All trackers</button>
          </div>
        </div>
        <div ref={yearRef} className={styles.yearScroll}>
          <Heatmap
            byDay={stats.byDay}
            trackerCount={trackers.length}
            tracker={mapMode === 'tracker' ? tracker : undefined}
            hue={hue}
            weeks={53}
            months
            className={styles.yearMap}
          />
        </div>
        <p className={styles.legend} aria-hidden="true" data-hued={mapMode === 'tracker' || undefined}>
          Less <i data-level="0" /><i data-level="1" /><i data-level="2" /><i data-level="3" /><i data-level="4" /> {mapMode === 'tracker' ? 'Goal' : 'More'}
        </p>
      </section>
    </div>
  )
}
