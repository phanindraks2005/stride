'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Dumbbell, Layers, Plus, Trophy, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDemo } from '@/lib/useDemo'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { toShownWeight, useUnits, weightUnit } from '@/lib/units'
import { weeklySessionsOf } from '@/lib/prefs'
import { REGIONS, intensityLevel, muscleHue, recoveryOf, regionOf } from '@/lib/muscles'
import {
  DEFAULT_GROUPS, byDay, findPRs, getExerciseLogs, kg, relativeDay, sinceDays, todayParam, volumeOf, weekStart, weeklyVolume,
} from '@/lib/fitness'
import BodyMap, { HEAT_RAMP, MuscleFigure } from '@/components/fitness/BodyMap'
import CountUp from '@/components/CountUp'
import Skeleton from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import styles from './fitness.module.css'

const VolumeChart = dynamic(() => import('@/components/fitness/VolumeChart'))

const LEVEL_WORD = ['Rested', 'Light', 'Working', 'Solid', 'Heavy']

// The empty state's figure: every muscle lit in the page's pink and orange
const EMPTY_LEVELS = { chest: 3, shoulders: 4, biceps: 3, core: 4, legs: 3, back: 4, triceps: 3 }

function VolumeTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const w = payload[0].payload
  return (
    <div className={styles.tip}>
      <span>Week of {w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      <b className="tnum">{kg(Math.round(w.volume))}</b>
      <span className="tnum">{w.sets} sets</span>
    </div>
  )
}

// Eight bars, oldest first, the last one (this week) solid
function MiniBars({ values, label }) {
  const max = Math.max(...values, 1)
  return (
    <span className={styles.miniBars} role="img" aria-label={label}>
      {values.map((v, i) => <i key={i} style={{ height: `${Math.max(6, (v / max) * 100)}%`, animationDelay: `${i * 40}ms` }} data-now={i === values.length - 1 || undefined} />)}
    </span>
  )
}

// This week against last week, as ↑12% / ↓8% / even
function Trend({ now, before }) {
  if (!before && !now) return null
  if (!before) return <span className={styles.trend} data-dir="up"><ArrowUpRight size={14} aria-hidden="true" />New</span>
  const pct = Math.round(((now - before) / before) * 100)
  // Small cards drop the note, like the percentages do
  if (pct === 0) return <span className={styles.trend}>Even<span className={styles.trendNote}>with last week</span></span>
  const up = pct > 0
  return (
    <span className={styles.trend} data-dir={up ? 'up' : 'down'}>
      {up ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
      <span className="tnum">{Math.abs(pct)}%</span><span className={styles.trendNote}>vs last week</span>
    </span>
  )
}

function RecoveryRing({ recovery, hue }) {
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <span className={styles.ring} data-state={recovery.state} style={{ '--hue': hue }}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={r} className={styles.ringTrack} />
        <circle cx="18" cy="18" r={r} className={styles.ringFill} strokeDasharray={c} strokeDashoffset={c * (1 - recovery.fill)} />
      </svg>
      <span>{recovery.label}</span>
    </span>
  )
}

function LoadingState() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading fitness">
      <Skeleton width="200px" height="40px" />
      <div className={styles.bento}>
        <Skeleton height="460px" radius="20px" />
        <Skeleton height="460px" radius="20px" />
      </div>
      <div className={styles.groupGrid}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height="180px" radius="16px" />)}</div>
    </div>
  )
}

export default function Fitness() {
  const router = useRouter()
  const { isDemo, href } = useDemo()
  const reduced = useReducedMotion()
  const units = useUnits()
  const [status, setStatus] = useState('loading')
  const [userId, setUserId] = useState(null)
  const [groups, setGroups] = useState([])
  const [exercises, setExercises] = useState([])
  const [logs, setLogs] = useState([])
  const [focus, setFocus] = useState([])
  const [focusError, setFocusError] = useState('')
  const [sessionGoal, setSessionGoal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')
  const seeded = useRef(false)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    const uid = session.user.id
    setUserId(uid)
    try {
      let groupRes = await supabase.from('muscle_groups').select('*').eq('user_id', uid).order('created_at')
      if (groupRes.error) throw groupRes.error
      // Accounts made before groups were seeded at sign-up get the defaults once
      if (groupRes.data.length === 0 && !seeded.current && !isDemo) {
        seeded.current = true
        for (const g of DEFAULT_GROUPS) {
          const { data: row } = await supabase.from('muscle_groups').insert({ user_id: uid, name: g.name }).select().single()
          if (row) await supabase.from('exercises').insert(g.exercises.map((name) => ({ user_id: uid, muscle_group_id: row.id, name })))
        }
        groupRes = await supabase.from('muscle_groups').select('*').eq('user_id', uid).order('created_at')
      }
      const [exRes, allLogs, selRes, profileRes] = await Promise.all([
        supabase.from('exercises').select('id, name, muscle_group_id').eq('user_id', uid),
        getExerciseLogs(uid),
        supabase.from('daily_selections').select('muscle_group_id').eq('user_id', uid).eq('selected_date', todayParam()),
        supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
      ])
      if (exRes.error || selRes.error) throw exRes.error || selRes.error
      setGroups(groupRes.data)
      setExercises(exRes.data)
      setLogs(allLogs)
      setFocus(selRes.data.map((s) => s.muscle_group_id))
      setSessionGoal(weeklySessionsOf(profileRes.data) || null)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [router, isDemo])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const view = useMemo(() => {
    const groupOf = Object.fromEntries(exercises.map((e) => [e.id, e.muscle_group_id]))
    const nameOf = Object.fromEntries(exercises.map((e) => [e.id, e.name]))
    const weekFrom = sinceDays(7)
    const lastWeekFrom = sinceDays(14)
    const week = logs.filter((l) => new Date(l.logged_at) >= weekFrom)
    const lastWeek = logs.filter((l) => { const d = new Date(l.logged_at); return d >= lastWeekFrom && d < weekFrom })
    const prs = findPRs(logs)

    const perGroup = groups.map((g) => {
      const gLogs = logs.filter((l) => groupOf[l.exercise_id] === g.id)
      const sets = week.filter((l) => groupOf[l.exercise_id] === g.id).reduce((n, l) => n + (l.sets || 0), 0)
      const last = gLogs[gLogs.length - 1]
      const region = regionOf(g.name)
      return {
        group: g, region, hue: muscleHue(g.name), sets, level: intensityLevel(sets), last: last?.logged_at,
        recovery: recoveryOf(last?.logged_at), exerciseCount: exercises.filter((e) => e.muscle_group_id === g.id).length,
      }
    })

    // Body map: sets per region this week, and the group each region opens
    const regionSets = {}
    const regionGroup = {}
    for (const p of perGroup) {
      if (!p.region) continue
      regionSets[p.region] = (regionSets[p.region] || 0) + p.sets
      regionGroup[p.region] ??= p.group
    }
    const levels = Object.fromEntries(Object.entries(regionSets).map(([k, v]) => [k, intensityLevel(v)]))
    const labels = Object.fromEntries(Object.keys(regionGroup).map((k) => [k, `${REGIONS[k].label}: ${regionSets[k] || 0} sets this week. Show only ${REGIONS[k].label.toLowerCase()}.`]))

    // Eight calendar weeks for the small charts
    const weeks = weeklyVolume(logs, 8)
    const weekIndex = (iso) => weeks.findIndex((w) => w.start.getTime() === weekStart(iso).getTime())
    const sessionDays = weeks.map(() => new Set())
    const prWeeks = weeks.map(() => 0)
    for (const l of logs) {
      const i = weekIndex(l.logged_at)
      if (i < 0) continue
      sessionDays[i].add(new Date(l.logged_at).toDateString())
      if (prs.has(l.id)) prWeeks[i]++
    }

    const monthFrom = sinceDays(30)
    const prevMonthFrom = sinceDays(60)
    const recentPRs = logs
      .filter((l) => prs.has(l.id) && new Date(l.logged_at) >= monthFrom)
      .reverse()
      .map((l) => ({ ...l, name: nameOf[l.exercise_id], groupId: groupOf[l.exercise_id] }))
    const sessions = byDay(logs).map((d) => ({
      ...d,
      groupIds: [...new Set(d.logs.map((l) => groupOf[l.exercise_id]))],
      sets: d.logs.reduce((n, l) => n + (l.sets || 0), 0),
      volume: d.logs.reduce((n, l) => n + volumeOf(l), 0),
      items: d.logs.map((l) => ({ ...l, name: nameOf[l.exercise_id], pr: prs.has(l.id), groupId: groupOf[l.exercise_id] })),
    }))
    const count = (list) => list.reduce((n, l) => n + (l.sets || 0), 0)
    const volume = (list) => Math.round(list.reduce((n, l) => n + volumeOf(l), 0))
    return {
      perGroup, levels, labels, regionGroup, weeks, recentPRs, sessions,
      spark: {
        volume: weeks.map((w) => w.volume),
        sets: weeks.map((w) => w.sets),
        sessions: sessionDays.map((s) => s.size),
        prs: prWeeks,
      },
      stats: {
        sessions: byDay(week).length, sessionsBefore: byDay(lastWeek).length,
        sets: count(week), setsBefore: count(lastWeek),
        volume: volume(week), volumeBefore: volume(lastWeek),
        prs: logs.filter((l) => prs.has(l.id) && new Date(l.logged_at) >= monthFrom).length,
        prsBefore: logs.filter((l) => { const d = new Date(l.logged_at); return prs.has(l.id) && d >= prevMonthFrom && d < monthFrom }).length,
      },
    }
  }, [groups, exercises, logs])

  async function toggleFocus(groupId) {
    const on = !focus.includes(groupId)
    const before = focus
    setFocus(on ? [...focus, groupId] : focus.filter((id) => id !== groupId))
    setFocusError('')
    const q = on
      ? supabase.from('daily_selections').insert({ user_id: userId, muscle_group_id: groupId, selected_date: todayParam() })
      : supabase.from('daily_selections').delete().eq('user_id', userId).eq('muscle_group_id', groupId).eq('selected_date', todayParam())
    const { error } = await q
    if (error) {
      setFocus(before)
      setFocusError("Couldn't save today's focus. Try again.")
    }
  }

  async function addGroup(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return setAddError('Give the group a name.')
    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) return setAddError('You already have that group.')
    const { error } = await supabase.from('muscle_groups').insert({ user_id: userId, name })
    if (error) return setAddError("Couldn't add the group. Try again.")
    setNewName('')
    setAdding(false)
    setAddError('')
    load()
  }

  if (status === 'loading') return <LoadingState />
  if (status === 'error') {
    return (
      <div className={styles.page}>
        <div className={`surface ${styles.message}`} role="alert">
          <h1 className={styles.messageTitle}>Couldn&apos;t load your training</h1>
          <p className="muted">Your data is safe. This is usually the connection.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load() }}>Try again</button>
        </div>
      </div>
    )
  }

  const { perGroup, levels, labels, regionGroup, weeks, spark, stats } = view
  const hasLogs = logs.length > 0
  const unit = weightUnit(units)
  // Tapping a muscle on the map narrows the cards, PRs and sessions to it
  const inRegion = (groupId) => !selected || regionOf(groups.find((g) => g.id === groupId)?.name || '') === selected
  const shownGroups = perGroup.filter((p) => !selected || p.region === selected)
  const shownPRs = view.recentPRs.filter((p) => inRegion(p.groupId)).slice(0, 5)
  const shownSessions = view.sessions
    .map((s) => ({ ...s, items: s.items.filter((i) => inRegion(i.groupId)) }))
    .filter((s) => s.items.length)
    .slice(0, 4)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Fitness</h1>
          <p className={styles.subtitle}>{hasLogs ? 'What you trained this week, how hard, and what moved.' : 'Pick a muscle group, then an exercise, and log your sets.'}</p>
        </div>
        {selected && (
          <button type="button" className={styles.filterPill} style={{ '--hue': REGIONS[selected].hue }} onClick={() => setSelected(null)}>
            Showing {REGIONS[selected].label.toLowerCase()}<X size={15} aria-hidden="true" /><span className="sr-only">, show everything</span>
          </button>
        )}
      </header>

      {hasLogs ? (
        <div className={styles.bento}>
          <section className={`surface ${styles.mapCard}`} aria-labelledby="map-title">
            <div className={styles.mapHead}>
              <div>
                <h2 id="map-title" className={styles.cardTitle}>This week&apos;s load</h2>
                <p className="faint">Sets per muscle in the last 7 days. Tap one to focus on it.</p>
              </div>
              <p className={styles.heatLegend} aria-hidden="true">
                Cool{HEAT_RAMP.map((c, i) => <i key={i} style={{ background: c }} />)}Hot
              </p>
            </div>
            <BodyMap levels={levels} groups={regionGroup} labels={labels} selected={selected} onSelect={(r) => setSelected(selected === r ? null : r)} />
          </section>

          <div className={styles.statStack}>
            <section className={`surface feature ${styles.volumeCard}`} style={{ '--g1': 'var(--t-workout)', '--g2': 'var(--t-protein)' }} aria-labelledby="vol-title">
              <div className={styles.statTop}>
                <h2 id="vol-title" className={styles.statLabel}>Volume this week</h2>
                <Trend now={stats.volume} before={stats.volumeBefore} />
              </div>
              <p className={styles.volumeNum}>
                <span className="num"><CountUp value={Math.round(toShownWeight(stats.volume, units))} /></span>
                <span>{unit}</span>
              </p>
              <p className={styles.volumeNote}>Sets × reps × weight. <span className="tnum">{stats.sets}</span> {stats.sets === 1 ? 'set' : 'sets'}, <span className="tnum">{stats.sessions}</span> {stats.sessions === 1 ? 'session' : 'sessions'}.</p>
              <MiniBars values={spark.volume} label={`Volume per week, last 8 weeks: ${spark.volume.map((v) => kg(Math.round(v))).join(', ')}`} />
            </section>

            <div className={styles.smallStats}>
              {[
                { key: 'sessions', label: 'Sessions', value: stats.sessions, before: stats.sessionsBefore, hue: 'var(--t-water)', extra: sessionGoal ? `of ${sessionGoal}` : null },
                { key: 'sets', label: 'Sets', value: stats.sets, before: stats.setsBefore, hue: 'var(--a-violet)' },
                { key: 'prs', label: 'PRs, 30 days', value: stats.prs, before: stats.prsBefore, hue: 'var(--t-calories)', icon: true },
              ].map((s) => (
                <section key={s.key} className={`surface tint ${styles.smallStat}`} style={{ '--hue': s.hue }} aria-label={s.label}>
                  <h2 className={styles.statLabel}>{s.icon && <Trophy size={13} aria-hidden="true" />}{s.label}</h2>
                  <p className={styles.smallNum}>
                    <span className="num"><CountUp value={s.value} /></span>
                    {s.extra && <span className={styles.unit}>{s.extra}</span>}
                  </p>
                  <Trend now={s.value} before={s.before} />
                  <MiniBars values={spark[s.key]} label={`${s.label} per week, last 8 weeks: ${spark[s.key].join(', ')}`} />
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          id="first-title"
          icon={<Dumbbell size={24} />}
          title="Log your first set"
          hues={['var(--t-workout)', 'var(--t-protein)']}
          art={<div className={styles.emptyMap}><BodyMap levels={EMPTY_LEVELS} compact /></div>}
          action={!isDemo && (picking ? (
            <div className={styles.pickList} role="group" aria-label="Pick a muscle group">
              {perGroup.map(({ group: g, region, hue }) => (
                <Link key={g.id} href={href(`/fitness/${g.id}`)} className={styles.pickChip} style={{ '--hue': hue }}>
                  <MuscleFigure region={region} hue={hue} size={30} />{g.name}
                </Link>
              ))}
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setPicking(true)}><Plus size={18} aria-hidden="true" />Log a set</button>
          ))}
        >
          <p>{picking ? 'Which muscle are you training? Pick one, then the exercise, and log sets × reps × weight.' : 'Every set heats up this body map, builds your weekly volume, and tracks PRs and recovery for each muscle.'}</p>
        </EmptyState>
      )}

      <section className={`surface ${styles.focus}`} aria-labelledby="focus-title">
        <div className={styles.focusHead}>
          <h2 id="focus-title" className={styles.cardTitle}>Today&apos;s focus</h2>
          <p className="faint">{focus.length ? `${focus.length} picked` : isDemo ? 'Nothing picked today' : 'Tap what you’re training today'}</p>
        </div>
        <div className={styles.focusChips}>
          {perGroup.map(({ group: g, region, hue }) => {
            const on = focus.includes(g.id)
            return (
              <button key={g.id} type="button" className={styles.focusChip} style={{ '--hue': hue }} aria-pressed={on} disabled={isDemo} onClick={() => toggleFocus(g.id)}>
                <MuscleFigure region={region} hue={on ? '#0b0c14' : hue} size={40} className={styles.chipFigure} />
                <span>{g.name}</span>
                {on && <Check size={16} strokeWidth={3} aria-hidden="true" className={styles.chipCheck} />}
              </button>
            )
          })}
        </div>
        {focusError && <p className="error-text" role="alert">{focusError}</p>}
      </section>

      <section aria-labelledby="groups-title">
        <div className={styles.sectionHead}>
          <h2 id="groups-title" className={styles.sectionTitle}>Muscle groups</h2>
          <p className={styles.legend} aria-hidden="true">
            <span data-state="recovering">Recovering</span><span data-state="fresh">Fresh</span><span data-state="rested">Rested</span>
          </p>
        </div>
        <div className={styles.groupGrid}>
          {shownGroups.map(({ group, region, hue, sets, level, last, recovery, exerciseCount }, i) => (
            <Link
              key={group.id}
              href={href(`/fitness/${group.id}`)}
              className={`surface tint lift ${styles.group}`}
              data-focus={focus.includes(group.id) || undefined}
              style={{ '--hue': hue, '--glow': hue, animationDelay: `${i * 50}ms` }}
            >
              <MuscleFigure region={region} hue={hue} size={112} className={styles.groupFigure} />
              <span className={styles.groupBody}>
                <span className={styles.groupTop}>
                  <span className={styles.groupName}>{group.name}</span>
                  {focus.includes(group.id) && <span className={styles.focusTag}>Today</span>}
                </span>
                <span className={styles.groupMeta}><b className="tnum">{sets}</b> sets this week · {LEVEL_WORD[level]}</span>
                <RecoveryRing recovery={recovery} hue={hue} />
                <span className={styles.groupFoot}>
                  {last ? `Last trained ${relativeDay(last)}` : `${exerciseCount} exercises, not trained yet`}
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
          {!selected && !isDemo && (adding ? (
            <form className={`surface ${styles.addForm}`} onSubmit={addGroup}>
              <label htmlFor="new-group" className="field-label">New muscle group</label>
              <input id="new-group" name="group" autoComplete="off" className="input" autoFocus maxLength={30} placeholder="Shoulders…" value={newName} onChange={(e) => { setNewName(e.target.value); setAddError('') }} />
              {addError && <p className="error-text" role="alert">{addError}</p>}
              <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary btn-sm">Add group</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setAddError('') }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button type="button" className={styles.addCard} onClick={() => setAdding(true)}>
              <Plus size={20} aria-hidden="true" />Add a group
            </button>
          ))}
        </div>
      </section>

      {hasLogs && (
        <div className={styles.split}>
          <section className={`surface tint ${styles.chartCard}`} style={{ '--hue': 'var(--t-workout)' }} aria-labelledby="volume-title">
            <h2 id="volume-title" className={styles.cardTitle}>Volume, last 8 weeks</h2>
            <p className="faint">Sets × reps × weight, per week</p>
            <div className={styles.chart} role="img" aria-label={weeks.map((w) => `${w.label}: ${kg(Math.round(w.volume))}`).join(', ')}>
              <VolumeChart data={weeks} tip={<VolumeTip />} units={units} reduced={reduced} />
            </div>
          </section>

          <section className={`surface tint ${styles.prCard}`} style={{ '--hue': 'var(--t-calories)' }} aria-labelledby="pr-title">
            <h2 id="pr-title" className={styles.cardTitle}>Recent PRs</h2>
            {shownPRs.length === 0 ? (
              <p className={styles.prEmpty}>Lift heavier than your best on any exercise and it lands here with a badge.</p>
            ) : (
              <ul className={styles.prList}>
                {shownPRs.map((pr, i) => (
                  <li key={pr.id} style={{ animationDelay: `${i * 80}ms` }}>
                    <span className={styles.prBadge}><Trophy size={14} aria-hidden="true" />PR</span>
                    <span className={styles.prName}>{pr.name}</span>
                    <span className="tnum"><b>{kg(pr.weight)}</b> × {pr.reps}</span>
                    <span className="faint">{relativeDay(pr.logged_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {hasLogs && (
        <section aria-labelledby="sessions-title">
          <h2 id="sessions-title" className={styles.sectionTitle}><Layers size={18} aria-hidden="true" />Recent sessions</h2>
          <ol className={styles.sessions}>
            {shownSessions.map((s) => {
              const names = s.groupIds.map((id) => groups.find((g) => g.id === id)).filter(Boolean)
              return (
                <li key={s.key} className={`surface tint ${styles.session}`} style={{ '--hue': names[0] ? muscleHue(names[0].name) : 'var(--t-workout)' }}>
                  <div className={styles.sessionHead}>
                    <div>
                      <h3 className={styles.sessionDay}>{relativeDay(s.date).replace(/^./, (c) => c.toUpperCase())}</h3>
                      <p className={styles.sessionGroups}>
                        {names.map((g) => <span key={g.id} style={{ '--hue': muscleHue(g.name) }}>{g.name}</span>)}
                      </p>
                    </div>
                    <p className={`${styles.sessionTotals} tnum`}>{s.sets} sets · {kg(Math.round(s.volume))}</p>
                  </div>
                  <ul className={styles.sessionItems}>
                    {s.items.slice(0, 6).map((l) => (
                      <li key={l.id}>
                        <span>{l.name}</span>
                        <span className="tnum faint">{l.sets} × {l.reps}{l.weight ? ` @ ${kg(l.weight)}` : ''}</span>
                        {l.pr && <span className={styles.prBadge}><Trophy size={12} aria-hidden="true" />PR</span>}
                      </li>
                    ))}
                    {s.items.length > 6 && <li className={styles.more}>and {s.items.length - 6} more</li>}
                  </ul>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}
