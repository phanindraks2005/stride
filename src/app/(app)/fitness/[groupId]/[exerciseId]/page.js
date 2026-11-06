'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ChevronLeft, Minus, Plus, Trash2, Trophy, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDemo } from '@/lib/useDemo'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { toKg, toShownWeight, useUnits, weightUnit } from '@/lib/units'
import { byDay, findPRs, kg, oneRepMax, relativeDay, sinceDays, volumeOf } from '@/lib/fitness'
import Burst from '@/components/Burst'
import CountUp from '@/components/CountUp'
import Skeleton from '@/components/Skeleton'
import RestTimer from '@/components/fitness/RestTimer'
import { muscleHue } from '@/lib/muscles'
import styles from '../../fitness.module.css'

const VolumeChart = dynamic(() => import('@/components/fitness/VolumeChart'))

const FILTERS = [['week', 'Week'], ['month', 'Month'], ['all', 'All']]

function Stepper({ id, label, value, onChange, step, min = 0, decimals = false }) {
  const n = parseFloat(value)
  function nudge(dir) {
    const next = Math.max(min, Math.round(((Number.isFinite(n) ? n : 0) + dir * step) * 10) / 10)
    onChange(String(next))
  }
  return (
    <div className={styles.stepper}>
      <label htmlFor={id} className={styles.stepperLabel}>{label}</label>
      <div className={styles.stepperBox}>
        <button type="button" onClick={() => nudge(1)} aria-label={`More ${label.toLowerCase()}`}><Plus size={17} aria-hidden="true" /></button>
        <input id={id} type="number" inputMode={decimals ? 'decimal' : 'numeric'} min={min} step={decimals ? 'any' : 1} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={() => nudge(-1)} aria-label={`Less ${label.toLowerCase()}`}><Minus size={17} aria-hidden="true" /></button>
      </div>
    </div>
  )
}

function SessionTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const s = payload[0].payload
  return (
    <div className={styles.tip}>
      <span>{s.full}</span>
      <b className="tnum">{kg(Math.round(s.volume))}</b>
      <span className="tnum">top set {kg(s.top)}</span>
    </div>
  )
}

export default function ExercisePage() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const units = useUnits()
  const { isDemo, href } = useDemo()
  const unit = weightUnit(units)
  const { groupId, exerciseId } = useParams()
  const [status, setStatus] = useState('loading')
  const [userId, setUserId] = useState(null)
  const [exercise, setExercise] = useState(null)
  const [group, setGroup] = useState(null)
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState({ sets: '3', reps: '10', weight: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('month')
  const [newId, setNewId] = useState(null)
  const [pr, setPr] = useState(null)
  const [restKey, setRestKey] = useState(0)
  const [confirming, setConfirming] = useState(false)

  const load = useCallback(async (prefill = false) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    const uid = session.user.id
    setUserId(uid)
    const [exRes, groupRes, logRes] = await Promise.all([
      supabase.from('exercises').select('*').eq('user_id', uid).eq('id', exerciseId).maybeSingle(),
      supabase.from('muscle_groups').select('id, name').eq('user_id', uid).eq('id', groupId).maybeSingle(),
      supabase.from('exercise_logs').select('id, exercise_id, sets, reps, weight, logged_at').eq('user_id', uid).eq('exercise_id', exerciseId).order('logged_at'),
    ])
    if (exRes.error || logRes.error) return setStatus('error')
    if (!exRes.data) return setStatus('missing')
    setExercise(exRes.data)
    setGroup(groupRes.data)
    setLogs(logRes.data)
    // Start the form from the last entry: most sessions repeat it
    const last = logRes.data[logRes.data.length - 1]
    if (prefill && last) setForm({ sets: String(last.sets), reps: String(last.reps), weight: last.weight ? String(toShownWeight(last.weight)) : '' })
    setStatus('ready')
  }, [exerciseId, groupId, router])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(true) }, [load])

  async function logSets(e) {
    e.preventDefault()
    if (busy || isDemo) return
    const sets = parseInt(form.sets, 10)
    const reps = parseInt(form.reps, 10)
    const weight = form.weight === '' ? null : toKg(parseFloat(form.weight), units)
    if (!(sets >= 1 && sets <= 50)) return setError('Sets must be between 1 and 50.')
    if (!(reps >= 1 && reps <= 500)) return setError('Reps must be between 1 and 500.')
    if (weight !== null && !(weight >= 0 && weight <= 1000)) return setError(`Weight must be between 0 and ${units === 'imperial' ? '2,200 lb' : '1,000 kg'}.`)
    setBusy(true)
    setError('')
    const bestBefore = Math.max(0, ...logs.map((l) => l.weight || 0))
    const { data, error: err } = await supabase.from('exercise_logs').insert({
      user_id: userId, exercise_id: exercise.id, sets, reps, weight, logged_at: new Date().toISOString(),
    }).select('id, exercise_id, sets, reps, weight, logged_at').single()
    setBusy(false)
    if (err) return setError("Couldn't save those sets. Check your connection and try again.")
    setLogs((prev) => [...prev, data])
    setNewId(data.id)
    setRestKey((k) => k + 1)
    setPr(weight && logs.length > 0 && weight > bestBefore ? { weight, by: weight - bestBefore, key: data.id } : null)
  }

  async function removeLog(id) {
    const { error: err } = await supabase.from('exercise_logs').delete().eq('id', id)
    if (err) return setError("Couldn't remove that entry. Try again.")
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  async function deleteExercise() {
    const { error: err } = await supabase.from('exercises').delete().eq('id', exercise.id)
    if (err) return setError("Couldn't delete the exercise. Try again.")
    router.push(href(`/fitness/${groupId}`))
  }

  const backHref = href(`/fitness/${groupId}`)
  const backLabel = group?.name || 'Back'

  if (status === 'loading') {
    return (
      <div className={styles.page} aria-busy="true" aria-label="Loading exercise">
        <Skeleton width="80px" height="20px" />
        <Skeleton width="300px" height="44px" />
        <div className={styles.exLayout}><Skeleton height="420px" radius="16px" /><Skeleton height="420px" radius="16px" /></div>
      </div>
    )
  }
  if (status === 'missing' || status === 'error') {
    return (
      <div className={styles.page}>
        <Link href={backHref} className={styles.back}><ChevronLeft size={16} aria-hidden="true" />Back</Link>
        <div className={`surface ${styles.message}`} role="alert">
          <h1 className={styles.messageTitle}>{status === 'missing' ? 'This exercise isn’t here' : 'Couldn’t load this exercise'}</h1>
          <p className="muted">{status === 'missing' ? 'It may have been deleted, or the link is wrong.' : 'Your data is safe. This is usually the connection.'}</p>
          {status === 'error'
            ? <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load(true) }}>Try again</button>
            : <Link href={href('/fitness')} className="btn btn-primary">Back to Fitness</Link>}
        </div>
      </div>
    )
  }

  const prs = findPRs(logs)
  const heaviest = logs.reduce((b, l) => ((l.weight || 0) > (b?.weight || 0) ? l : b), null)
  const best1rm = logs.reduce((b, l) => (oneRepMax(l) > (b ? oneRepMax(b) : 0) ? l : b), null)
  const sessions = byDay(logs)
  const bestSession = sessions.reduce((b, s) => {
    const v = s.logs.reduce((n, l) => n + volumeOf(l), 0)
    return v > (b?.volume || 0) ? { volume: v, date: s.date } : b
  }, null)
  const chart = sessions.slice(0, 12).reverse().map((s) => ({
    label: s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    full: s.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    volume: s.logs.reduce((n, l) => n + volumeOf(l), 0),
    top: Math.max(0, ...s.logs.map((l) => l.weight || 0)),
  }))
  const cutoff = filter === 'all' ? null : sinceDays(filter === 'week' ? 7 : 30)
  const shown = byDay(cutoff ? logs.filter((l) => new Date(l.logged_at) >= cutoff) : logs)
  const preview = (() => {
    const s = parseInt(form.sets, 10)
    const r = parseInt(form.reps, 10)
    const w = parseFloat(form.weight)
    if (!(s > 0 && r > 0)) return ''
    return w > 0 ? `${s} × ${r} at ${kg(toKg(w, units))} = ${kg(s * r * toKg(w, units))} volume` : `${s} × ${r}, bodyweight`
  })()

  const hue = muscleHue(group?.name || 'workout')

  return (
    <div className={styles.page} style={{ '--hue': hue }}>
      <Link href={backHref} className={styles.back}><ChevronLeft size={16} aria-hidden="true" />{backLabel}</Link>
      <header className={`feature ${styles.exFeature}`} style={{ '--g1': hue, '--g2': `color-mix(in srgb, ${hue} 55%, #fff)` }}>
        <div>
          <h1 className={styles.title}>{exercise.name}</h1>
          <p className={styles.featureSub}>{logs.length ? `${sessions.length} sessions · last ${relativeDay(logs[logs.length - 1].logged_at)}` : 'No sets logged yet'}</p>
        </div>

      <dl className={styles.bests}>
        <div className={styles.best}>
          <dt><Trophy size={14} aria-hidden="true" />Heaviest</dt>
          <dd>{heaviest?.weight ? <><span className="num"><CountUp value={toShownWeight(heaviest.weight, units)} /></span>{unit} × {heaviest.reps}</> : <span>—</span>}</dd>
        </div>
        <div className={styles.best}>
          <dt>Best est. 1RM</dt>
          <dd>{best1rm && oneRepMax(best1rm) ? <><span className="num"><CountUp value={Math.round(toShownWeight(oneRepMax(best1rm), units))} /></span>{unit}</> : <span>—</span>}</dd>
        </div>
        <div className={styles.best}>
          <dt>Best session</dt>
          <dd>{bestSession ? <><span className="num"><CountUp value={Math.round(toShownWeight(bestSession.volume, units))} /></span>{unit} volume</> : <span>—</span>}</dd>
        </div>
      </dl>
      </header>

      <div className={styles.exLayout}>
        <div className={styles.leftCol}>
          <form className={`surface tint ${styles.logCard}`} onSubmit={logSets} aria-labelledby="log-title" noValidate>
            {pr && <Burst key={pr.key} x="50%" y="70%" count={16} />}
            <h2 id="log-title" className={styles.cardTitle}>Log sets</h2>
            <fieldset className={styles.steppers} disabled={isDemo}>
              <Stepper id="sets" label="Sets" value={form.sets} step={1} min={1} onChange={(v) => { setForm({ ...form, sets: v }); setError('') }} />
              <Stepper id="reps" label="Reps" value={form.reps} step={1} min={1} onChange={(v) => { setForm({ ...form, reps: v }); setError('') }} />
              <Stepper id="weight" label={`Weight (${unit})`} value={form.weight} step={units === 'imperial' ? 5 : 2.5} decimals onChange={(v) => { setForm({ ...form, weight: v }); setError('') }} />
            </fieldset>
            <p className={styles.logPreview} aria-live="polite">{preview}</p>
            {error && <p className="error-text" role="alert">{error}</p>}
            {pr && <p className={styles.prFlash} role="status"><Trophy size={18} aria-hidden="true" />New PR: {kg(pr.weight)}, up {kg(pr.by)}</p>}
            {isDemo
              ? <Link href="/signup" className={`btn btn-primary ${styles.logBtn}`}>Sign up to log your sets</Link>
              : <button type="submit" className={`btn btn-primary ${styles.logBtn}`} disabled={busy}>{busy ? 'Saving…' : 'Log sets'}</button>}
          </form>
          <RestTimer startKey={restKey} />
        </div>

        <div className={styles.rightCol}>
          <section className={`surface tint ${styles.chartCard}`} aria-labelledby="ex-volume-title">
            <h2 id="ex-volume-title" className={styles.cardTitle}>Volume per session</h2>
            <p className="faint">Last {chart.length || 12} sessions</p>
            <div className={styles.chart} role="img" aria-label={chart.map((c) => `${c.full}: ${kg(Math.round(c.volume))}`).join(', ') || 'No sessions yet'}>
              {chart.length ? (
<VolumeChart data={chart} tip={<SessionTip />} units={units} reduced={reduced} interval="preserveStartEnd" maxBarSize={32} duration={800} />
              ) : <p className={styles.chartEmpty}>Your sessions build a chart here.</p>}
            </div>
          </section>

          <section className={`surface tint ${styles.history}`} aria-labelledby="history-title">
            <div className={styles.historyHead}>
              <h2 id="history-title" className={styles.cardTitle}>History</h2>
              <div className={styles.filter} role="group" aria-label="Show">
                {FILTERS.map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
                ))}
              </div>
            </div>
            {shown.length === 0 ? (
              <p className="faint">{logs.length ? 'Nothing in this range. Try All.' : 'Your logged sets show up here, by day.'}</p>
            ) : (
              <table className={styles.table}>
                <caption className="sr-only">Sets logged, newest first</caption>
                <thead>
                  <tr><th scope="col">Sets × reps</th><th scope="col">Weight</th><th scope="col">Volume</th>{!isDemo && <th scope="col"><span className="sr-only">Remove</span></th>}</tr>
                </thead>
                {shown.map((day) => (
                  <tbody key={day.key}>
                    <tr className={styles.dayRow}>
                      <th scope="rowgroup" colSpan={isDemo ? 3 : 4}>{day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</th>
                    </tr>
                    {[...day.logs].reverse().map((l) => (
                      <tr key={l.id} data-new={l.id === newId || undefined}>
                        <td>
                          {l.sets} × {l.reps}
                          {prs.has(l.id) && <span className={`${styles.prBadge} ${styles.tdPr}`}><Trophy size={12} aria-hidden="true" />PR</span>}
                        </td>
                        <td>{l.weight ? kg(l.weight) : 'Body'}</td>
                        <td>{volumeOf(l) ? kg(volumeOf(l)) : '—'}</td>
                        {!isDemo && <td>
                          <button type="button" className="icon-btn" onClick={() => removeLog(l.id)} aria-label={`Remove ${l.sets} × ${l.reps}${l.weight ? ` at ${kg(l.weight)}` : ''}`}>
                            <X size={15} aria-hidden="true" />
                          </button>
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            )}
          </section>

          {!isDemo && <section className={`surface ${styles.danger}`} aria-label="Delete exercise">
            {confirming ? (
              <div className={styles.confirm} role="alert">
                <p>Delete <b>{exercise.name}</b> and all {logs.length} entries logged to it? This can&apos;t be undone.</p>
                <div className={styles.formActions}>
                  <button type="button" className="btn btn-danger btn-sm" onClick={deleteExercise} autoFocus><Trash2 size={15} aria-hidden="true" />Delete exercise</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Keep it</button>
                </div>
              </div>
            ) : (
              <button type="button" className={styles.deleteLink} onClick={() => setConfirming(true)}><Trash2 size={15} aria-hidden="true" />Delete {exercise.name}</button>
            )}
          </section>}
        </div>
      </div>
    </div>
  )
}
