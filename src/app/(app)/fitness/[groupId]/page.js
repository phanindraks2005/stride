'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Trash2, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDemo } from '@/lib/useDemo'
import { muscleHue, recoveryOf, regionOf } from '@/lib/muscles'
import { MuscleFigure } from '@/components/fitness/BodyMap'
import CountUp from '@/components/CountUp'
import { kg, relativeDay, sinceDays, volumeOf } from '@/lib/fitness'
import { toShownWeight, useUnits, weightUnit } from '@/lib/units'
import Skeleton from '@/components/Skeleton'
import styles from '../fitness.module.css'

// Heaviest weight per session, for the little trend line on each card
function sessionTops(logs) {
  const days = new Map()
  for (const l of logs) {
    const key = new Date(l.logged_at).toDateString()
    days.set(key, Math.max(days.get(key) || 0, l.weight || 0))
  }
  return [...days.values()].slice(-10)
}

function Spark({ values }) {
  if (values.length < 2) return <svg className={styles.exSpark} aria-hidden="true" />
  const max = Math.max(...values) || 1
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 40 - ((v - min) / span) * 34])
  return (
    <svg className={styles.exSpark} viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} />
    </svg>
  )
}

export default function MuscleGroupPage() {
  const router = useRouter()
  const { groupId } = useParams()
  const [status, setStatus] = useState('loading')
  const [userId, setUserId] = useState(null)
  const [group, setGroup] = useState(null)
  const [exercises, setExercises] = useState([])
  const [logs, setLogs] = useState([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const { isDemo, href } = useDemo()
  const units = useUnits()

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    const uid = session.user.id
    setUserId(uid)
    const [groupRes, exRes] = await Promise.all([
      supabase.from('muscle_groups').select('*').eq('user_id', uid).eq('id', groupId).maybeSingle(),
      supabase.from('exercises').select('*').eq('user_id', uid).eq('muscle_group_id', groupId).order('created_at'),
    ])
    if (groupRes.error || exRes.error) return setStatus('error')
    if (!groupRes.data) return setStatus('missing')
    const ids = exRes.data.map((e) => e.id)
    const logRes = ids.length
      ? await supabase.from('exercise_logs').select('id, exercise_id, sets, reps, weight, logged_at').eq('user_id', uid).in('exercise_id', ids).order('logged_at')
      : { data: [] }
    if (logRes.error) return setStatus('error')
    setGroup(groupRes.data)
    setExercises(exRes.data)
    setLogs(logRes.data)
    setStatus('ready')
  }, [groupId, router])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function addExercise(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return setError('Give the exercise a name.')
    if (exercises.some((x) => x.name.toLowerCase() === name.toLowerCase())) return setError('That exercise is already here.')
    const { error: err } = await supabase.from('exercises').insert({ user_id: userId, muscle_group_id: group.id, name })
    if (err) return setError("Couldn't add the exercise. Try again.")
    setNewName('')
    setAdding(false)
    setError('')
    load()
  }

  async function deleteGroup() {
    setBusy(true)
    // Exercises, their logs and daily picks go with it (on delete cascade)
    const { error: err } = await supabase.from('muscle_groups').delete().eq('id', group.id)
    setBusy(false)
    if (err) return setError("Couldn't delete the group. Try again.")
    router.push(href('/fitness'))
  }

  if (status === 'loading') {
    return (
      <div className={styles.page} aria-busy="true" aria-label="Loading muscle group">
        <Skeleton width="80px" height="20px" />
        <Skeleton width="260px" height="64px" radius="16px" />
        <div className={styles.exList}>{[0, 1, 2].map((i) => <Skeleton key={i} height="170px" radius="16px" />)}</div>
      </div>
    )
  }
  if (status === 'missing' || status === 'error') {
    return (
      <div className={styles.page}>
        <Link href={href('/fitness')} className={styles.back}><ChevronLeft size={16} aria-hidden="true" />Fitness</Link>
        <div className={`surface ${styles.message}`} role="alert">
          <h1 className={styles.messageTitle}>{status === 'missing' ? 'This muscle group isn’t here' : 'Couldn’t load this group'}</h1>
          <p className="muted">{status === 'missing' ? 'It may have been deleted, or the link is wrong.' : 'Your data is safe. This is usually the connection.'}</p>
          {status === 'error'
            ? <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load() }}>Try again</button>
            : <Link href={href('/fitness')} className="btn btn-primary">Back to Fitness</Link>}
        </div>
      </div>
    )
  }

  const weekFrom = sinceDays(7)
  const week = logs.filter((l) => new Date(l.logged_at) >= weekFrom)
  const weekSets = week.reduce((n, l) => n + (l.sets || 0), 0)
  const weekVolume = Math.round(week.reduce((n, l) => n + volumeOf(l), 0))
  const hue = muscleHue(group.name)
  const last = logs[logs.length - 1]?.logged_at
  const recovery = recoveryOf(last)

  return (
    <div className={styles.page}>
      <Link href={href('/fitness')} className={styles.back}><ChevronLeft size={16} aria-hidden="true" />Fitness</Link>
      <header className={`feature ${styles.groupFeature}`} style={{ '--g1': hue, '--g2': `color-mix(in srgb, ${hue} 55%, #fff)`, '--hue': hue }}>
        <MuscleFigure region={regionOf(group.name)} hue="#07080d" rest="#07080d26" base="#07080d14" size={150} className={styles.featureFigure} />
        <div className={styles.featureText}>
          <h1 className={styles.title}>{group.name}</h1>
          <p className={styles.featureSub}>{exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} · {last ? `last trained ${relativeDay(last)}` : 'not trained yet'}</p>
          <dl className={styles.featureStats}>
            <div><dt>Sets this week</dt><dd className="num"><CountUp value={weekSets} /></dd></div>
            <div><dt>Volume this week</dt><dd><span className="num"><CountUp value={Math.round(toShownWeight(weekVolume, units))} /></span><span>{weightUnit(units)}</span></dd></div>
            <div><dt>Recovery</dt><dd className={styles.featureWord}>{recovery.label}</dd></div>
          </dl>
        </div>
        {!isDemo && <button type="button" className={`btn btn-ink btn-sm ${styles.featureAction}`} onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Add exercise</button>}
      </header>

      {adding && (
        <form className={`surface ${styles.addForm}`} onSubmit={addExercise} style={{ maxWidth: 520 }}>
          <label htmlFor="new-exercise" className="field-label">New exercise</label>
          <input id="new-exercise" name="exercise" autoComplete="off" className="input" autoFocus maxLength={60} placeholder="Cable Crossover…" value={newName} onChange={(e) => { setNewName(e.target.value); setError('') }} />
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary btn-sm">Add exercise</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setError('') }}>Cancel</button>
          </div>
        </form>
      )}

      {exercises.length === 0 ? (
        <div className={`surface ${styles.message}`}>
          <p className="muted">No exercises in {group.name} yet. Add the ones you do and log your sets on each.</p>
          {!adding && !isDemo && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Add an exercise</button>}
        </div>
      ) : (
        <ul className={styles.exList}>
          {exercises.map((ex, i) => {
            const exLogs = logs.filter((l) => l.exercise_id === ex.id)
            const last = exLogs[exLogs.length - 1]
            const best = Math.max(0, ...exLogs.map((l) => l.weight || 0))
            return (
              <li key={ex.id}>
                <Link href={href(`/fitness/${group.id}/${ex.id}`)} className={`surface tint lift ${styles.exCard}`} style={{ '--hue': hue, '--glow': hue, animationDelay: `${i * 60}ms` }}>
                  <span className={styles.exHead}>
                    <span className={styles.exName}>{ex.name}</span>
                    {best > 0 && <span className={styles.prBadge}><Trophy size={12} aria-hidden="true" />{kg(best)}</span>}
                  </span>
                  <span className={styles.exLast}>
                    {last ? <>Last: <b className="tnum">{last.sets} × {last.reps}{last.weight ? ` @ ${kg(last.weight)}` : ''}</b></> : 'Not logged yet'}
                  </span>
                  <Spark values={sessionTops(exLogs)} />
                  <span className={styles.exFoot}>
                    <span>{last ? relativeDay(last.logged_at) : 'Tap to log your first sets'}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {!isDemo && <section className={`surface ${styles.danger}`} aria-label="Delete group">
        {confirming ? (
          <div className={styles.confirm} role="alert">
            <p>Delete <b>{group.name}</b>, its {exercises.length} exercises and every set logged to them? This can&apos;t be undone.</p>
            {error && <p className="error-text">{error}</p>}
            <div className={styles.formActions}>
              <button type="button" className="btn btn-danger btn-sm" onClick={deleteGroup} disabled={busy} autoFocus>
                <Trash2 size={15} aria-hidden="true" />{busy ? 'Deleting…' : 'Delete group'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Keep it</button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.deleteLink} onClick={() => setConfirming(true)}><Trash2 size={15} aria-hidden="true" />Delete {group.name}</button>
        )}
      </section>}
    </div>
  )
}
