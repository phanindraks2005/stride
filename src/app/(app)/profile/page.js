'use client'
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CalendarCheck, Check, Dumbbell, Flame, Heart, LogOut, Minus, Plus, Ruler, Scale, Shuffle, Target, UserRound, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getQuickSteps, getTrackerColor, getTrackerIcon } from '@/lib/trackerIcons'
import { cmToFeetInches, feetInchesToCm, getUnits, storeUnits, toKg, toShownWeight } from '@/lib/units'
import { isMissingColumn, storeWeeklySessions, weeklySessionsOf } from '@/lib/prefs'
import { useDemo } from '@/lib/useDemo'
import { getStreakStats } from '@/lib/streak'
import { fmt } from '@/components/today/format'
import Skeleton from '@/components/Skeleton'
import styles from './profile.module.css'

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  { value: 'custom', label: 'Self-describe' },
]
const KNOWN = GENDERS.slice(0, 4).map((g) => g.value)

const STARTER_SEEDS = ['Aiden', 'Sasha', 'Milo', 'Luna', 'Kai', 'Nova', 'Zoe', 'Leo', 'Maya', 'Ravi', 'Ines', 'Theo']
const avatarUrl = (seed) => `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`

const BANDS = [
  { max: 18.5, label: 'Underweight', color: 'var(--t-water)' },
  { max: 25, label: 'Healthy range', color: 'var(--volt)' },
  { max: 30, label: 'Overweight', color: 'var(--t-calories)' },
  { max: Infinity, label: 'Obese', color: 'var(--t-workout)' },
]

function randomSeeds(n) {
  return Array.from({ length: n }, () => Math.random().toString(36).slice(2, 8))
}

function str(v) {
  return v === null || v === undefined ? '' : String(v)
}

// Body numbers as typed in the chosen units → metric, or an error message
function bodyInMetric(f) {
  const out = { age: null, height_cm: null, weight_kg: null }
  if (f.age !== '') {
    const n = Number(f.age)
    if (!Number.isInteger(n) || n < 13 || n > 120) return { error: 'Age should be a whole number between 13 and 120.' }
    out.age = n
  }
  const imperial = f.units === 'imperial'
  if (imperial ? f.feet !== '' || f.inches !== '' : f.height !== '') {
    // Unchanged feet and inches keep the exact stored centimetres
    const exact = Number(f.heightCm)
    const fi = exact ? cmToFeetInches(exact) : null
    const same = fi && String(fi.feet) === f.feet && String(fi.inches) === f.inches
    const cm = imperial ? (same ? exact : feetInchesToCm(f.feet, f.inches)) : Number(f.height)
    if (!Number.isFinite(cm) || cm < 100 || cm > 250) return { error: imperial ? 'Height should be between 3 ft 4 in and 8 ft 2 in.' : 'Height should be between 100 and 250 cm.' }
    out.height_cm = cm
  }
  if (f.weight !== '') {
    const kg = toKg(f.weight, f.units)
    if (!Number.isFinite(kg) || kg < 25 || kg > 400) return { error: imperial ? 'Weight should be between 55 and 880 lb.' : 'Weight should be between 25 and 400 kg.' }
    out.weight_kg = Math.round(kg * 10) / 10
  }
  return out
}

function formFrom(profile, units) {
  const known = KNOWN.includes(profile?.gender)
  const height = profile?.height_cm ? cmToFeetInches(profile.height_cm) : null
  return {
    name: profile?.name || '',
    avatar_seed: profile?.avatar_seed || '',
    gender: profile?.gender ? (known ? profile.gender : 'custom') : '',
    genderText: profile?.gender && !known ? profile.gender : '',
    units,
    age: str(profile?.age),
    height: str(profile?.height_cm),
    heightCm: str(profile?.height_cm),
    feet: height ? String(height.feet) : '',
    inches: height ? String(height.inches) : '',
    weight: profile?.weight_kg ? String(toShownWeight(profile.weight_kg, units)) : '',
    // Three a week until they pick their own
    weekly_sessions: weeklySessionsOf(profile) ?? 3,
  }
}

function Stepper({ id, value, onChange, step, label, unit, min = 0 }) {
  const n = parseFloat(value)
  function nudge(dir) {
    const now = Number.isFinite(n) ? n : 0
    onChange(String(Math.max(min, Math.round((now + dir * step) * 100) / 100)))
  }
  return (
    <div className={styles.stepper}>
      <button type="button" className={styles.stepBtn} onClick={() => nudge(-1)} aria-label={`Lower ${label}`}><Minus size={16} aria-hidden="true" /></button>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} name={id} autoComplete="off" className={`input ${styles.stepInput}`} type="number" inputMode="decimal" min={min} step="any" value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className={styles.stepBtn} onClick={() => nudge(1)} aria-label={`Raise ${label}`}><Plus size={16} aria-hidden="true" /></button>
      {unit && <span className={styles.stepUnit}>{unit}</span>}
    </div>
  )
}

function LoadingState() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading your profile">
      <Skeleton width="200px" height="40px" />
      <div className={styles.layout}>
        <Skeleton height="320px" radius="16px" />
        <div className={styles.sections}>{[0, 1, 2].map((i) => <Skeleton key={i} height="200px" radius="16px" />)}</div>
      </div>
    </div>
  )
}

export default function Profile() {
  const router = useRouter()
  const { isDemo, href } = useDemo()
  const [status, setStatus] = useState('loading')
  const [userId, setUserId] = useState(null)
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(null)
  const [saved, setSaved] = useState(null)
  const [form, setForm] = useState(null)
  const [trackers, setTrackers] = useState([])
  const [goals, setGoals] = useState({})
  const [seeds, setSeeds] = useState(STARTER_SEEDS)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  const [toast, setToast] = useState(false)
  const [stats, setStats] = useState(null)
  const [today, setToday] = useState({})
  const [picking, setPicking] = useState(false)
  const pickerRef = useRef(null)
  const toastTimer = useRef(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    const uid = session.user.id
    setUserId(uid)
    setEmail(session.user.email || '')
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const [profileRes, trackerRes, todayRes, streak] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('trackers').select('*').eq('user_id', uid).order('id'),
      supabase.from('logs').select('tracker_id, value').eq('user_id', uid).gte('logged_at', start.toISOString()),
      getStreakStats(uid).catch(() => null),
    ])
    if (profileRes.error || trackerRes.error) {
      setStatus('error')
      return
    }
    const profile = profileRes.data
    // The column wins; without it (older databases) this browser's choice does
    const units = profile && 'units' in profile ? profile.units || 'metric' : getUnits()
    const initial = formFrom(profile, units)
    const targets = Object.fromEntries(trackerRes.data.map((t) => [t.id, String(t.target_value)]))
    if (initial.avatar_seed && !STARTER_SEEDS.includes(initial.avatar_seed)) setSeeds([initial.avatar_seed, ...STARTER_SEEDS.slice(0, 11)])
    setJoined(profile?.created_at || session.user.created_at || null)
    setForm(initial)
    setSaved({ form: initial, goals: targets })
    setTrackers(trackerRes.data)
    setGoals(targets)
    const sums = {}
    for (const l of todayRes.data || []) sums[l.tracker_id] = (sums[l.tracker_id] || 0) + l.value
    setToday(sums)
    if (streak) {
      // Favourite: the tracker logged on the most days
      const daysPer = {}
      for (const day of Object.values(streak.byDay)) for (const id of Object.keys(day)) daysPer[id] = (daysPer[id] || 0) + 1
      const favId = Object.keys(daysPer).sort((a, b) => daysPer[b] - daysPer[a])[0]
      setStats({ current: streak.current, days: Object.keys(streak.byDay).length, favourite: trackerRes.data.find((t) => String(t.id) === favId) || null })
    }
    setStatus('ready')
  }, [router])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const dirty = useMemo(() => {
    if (!form || !saved) return false
    return JSON.stringify(form) !== JSON.stringify(saved.form) || JSON.stringify(goals) !== JSON.stringify(saved.goals)
  }, [form, goals, saved])

  // Don't lose edits to a closed tab
  useEffect(() => {
    if (!dirty || isDemo) return
    const warn = (e) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, isDemo])

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }))
    setNotice(null)
  }

  // Switching units converts what's already typed
  function switchUnits(units) {
    if (units === form.units) return
    const body = bodyInMetric(form)
    const height = body.height_cm ? cmToFeetInches(body.height_cm) : null
    update({
      units,
      height: body.height_cm ? String(body.height_cm) : form.units === 'metric' ? form.height : '',
      heightCm: body.height_cm ? String(body.height_cm) : '',
      feet: height ? String(height.feet) : '',
      inches: height ? String(height.inches) : '',
      weight: body.weight_kg ? String(toShownWeight(body.weight_kg, units)) : form.weight,
    })
  }

  async function save(e) {
    e.preventDefault()
    if (saving || isDemo) return
    const body = bodyInMetric(form)
    if (body.error) return setNotice({ error: body.error })
    if (form.gender === 'custom' && !form.genderText.trim()) return setNotice({ error: 'Describe your gender, or pick another option.' })
    if (form.name.trim().length > 40) return setNotice({ error: 'Keep your name under 40 characters.' })
    const sessions = form.weekly_sessions === '' ? null : Number(form.weekly_sessions)
    if (sessions !== null && !(Number.isInteger(sessions) && sessions >= 0 && sessions <= 14)) return setNotice({ error: 'Weekly sessions should be a whole number from 0 to 14.' })
    const changed = trackers.filter((t) => goals[t.id] !== saved.goals[t.id])
    for (const t of changed) {
      const n = Number(goals[t.id])
      if (!Number.isFinite(n) || n <= 0 || n > 1000000) return setNotice({ error: `The daily goal for ${t.name} must be above 0.` })
    }

    setSaving(true)
    setNotice(null)
    const row = {
      user_id: userId,
      name: form.name.trim() || null,
      gender: form.gender === 'custom' ? form.genderText.trim() : form.gender || null,
      avatar_seed: form.avatar_seed || null,
      ...body,
      units: form.units,
      weekly_sessions: sessions,
    }
    let result = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' })
    if (isMissingColumn(result.error)) {
      // Older database: keep the two newer settings in this browser
      const { units, weekly_sessions, ...rest } = row
      result = await supabase.from('profiles').upsert(rest, { onConflict: 'user_id' })
      storeWeeklySessions(weekly_sessions)
    }
    const { error } = result
    const goalResults = await Promise.all(changed.map((t) => supabase.from('trackers').update({ target_value: Number(goals[t.id]) }).eq('id', t.id)))
    setSaving(false)
    if (error || goalResults.some((r) => r.error)) {
      setNotice({ error: "Couldn't save everything. Check your connection and try again." })
      return
    }
    storeUnits(form.units)
    const nextGoals = { ...goals }
    for (const t of changed) nextGoals[t.id] = String(Number(goals[t.id]))
    setGoals(nextGoals)
    setTrackers(trackers.map((t) => (nextGoals[t.id] ? { ...t, target_value: Number(nextGoals[t.id]) } : t)))
    setSaved({ form, goals: nextGoals })
    setToast(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(false), 2200)
    window.dispatchEvent(new Event('profileUpdated'))
  }

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (picking) pickerRef.current?.showModal()
  }, [picking])

  function pickAvatar(seed) {
    update({ avatar_seed: seed })
    pickerRef.current?.close()
  }

  async function logOut() {
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login')
  }

  if (status === 'loading') return <LoadingState />
  if (status === 'error') {
    return (
      <div className={styles.page}>
        <div className={`surface ${styles.message}`} role="alert">
          <h1 className={styles.messageTitle}>Couldn&apos;t load your profile</h1>
          <p className="muted">Nothing is lost. This is usually the connection.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load() }}>Try again</button>
        </div>
      </div>
    )
  }

  const body = bodyInMetric(form)
  const bmi = !body.error && body.height_cm && body.weight_kg ? body.weight_kg / (body.height_cm / 100) ** 2 : null
  const band = bmi ? BANDS.find((b) => bmi < b.max) : null
  const pos = bmi ? Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100)) : 0
  const imperial = form.units === 'imperial'
  const genderLabel = form.gender === 'custom' ? form.genderText.trim() : GENDERS.find((g) => g.value === form.gender)?.label
  const displayName = form.name.trim() || email.split('@')[0] || 'You'
  // Until one is picked, a DiceBear face made from the name, never a bare letter
  const faceSeed = form.avatar_seed || displayName
  const sinceLabel = joined ? new Date(joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '–'

  return (
    <form className={styles.page} onSubmit={save} noValidate>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.subtitle}>{isDemo ? 'A sample profile. Nothing here can be changed.' : `Signed in as ${email}`}</p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={`surface feature ${styles.card}`} style={{ '--g1': 'var(--a-violet)', '--g2': 'var(--t-water)' }} aria-label="Your profile at a glance">
          <div className={styles.avatarWrap}>
            <span className={styles.bigAvatar}>
              <img key={faceSeed} src={avatarUrl(faceSeed)} alt="" width={128} height={128} />
            </span>
            {!isDemo && <button type="button" className={`btn btn-ink btn-sm ${styles.change}`} onClick={() => setPicking(true)}>Change</button>}
          </div>
          <div className={styles.who}>
            <p className={styles.cardName}>{displayName}</p>
            {genderLabel && form.gender !== 'prefer-not-to-say' && <p className={styles.cardSub}>{genderLabel}</p>}
          </div>
          <ul className={styles.chips} aria-label="Your numbers">
            <li style={{ '--hue': 'var(--volt)' }}><Flame size={15} aria-hidden="true" /><b className="tnum">{stats ? stats.current : '–'}</b><span>day streak</span></li>
            <li style={{ '--hue': 'var(--t-water)' }}><CalendarCheck size={15} aria-hidden="true" /><b className="tnum">{stats ? fmt(stats.days) : '–'}</b><span>days logged</span></li>
            <li style={{ '--hue': stats?.favourite ? getTrackerColor(stats.favourite) : 'var(--t-workout)' }}><Heart size={15} aria-hidden="true" /><b>{stats?.favourite?.name || '–'}</b><span>favourite</span></li>
            <li style={{ '--hue': 'var(--a-violet)' }}><Check size={15} aria-hidden="true" /><b>{sinceLabel}</b><span>member since</span></li>
          </ul>
          <div className={styles.bmi} data-on={bmi ? '' : undefined}>
            <div className={styles.bmiTop}>
              <span>BMI</span>
              <span className="num">{bmi ? bmi.toFixed(1) : '–'}</span>
              <span className={styles.bmiBand}>{band ? band.label : 'Add height and weight'}</span>
            </div>
            <div className={styles.scale} aria-hidden="true">
              <i style={{ flex: 3.5, background: 'var(--t-water)' }} />
              <i style={{ flex: 6.5, background: 'var(--volt)' }} />
              <i style={{ flex: 5, background: 'var(--t-calories)' }} />
              <i style={{ flex: 5, background: 'var(--t-workout)' }} />
              {bmi && <b style={{ left: `${pos}%` }} />}
            </div>
          </div>
          {!isDemo && (
            <button type="button" className={`btn btn-sm ${styles.logout}`} onClick={logOut}>
              <LogOut size={16} aria-hidden="true" />Log out
            </button>
          )}
        </aside>

        <fieldset className={styles.sections} disabled={isDemo}>
          <section className={`surface tint ${styles.section}`} style={{ '--hue': 'var(--a-violet)' }} aria-labelledby="about-title">
            <h2 id="about-title" className={styles.sectionTitle}><span className={styles.titleIcon} aria-hidden="true"><UserRound size={17} /></span>About you</h2>
            <div className={styles.field}>
              <label htmlFor="name" className="field-label">Name</label>
              <input id="name" name="name" className="input" autoComplete="given-name" maxLength={40} placeholder="What Libra calls you…" value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <fieldset className={styles.field}>
              <legend className="field-label">Gender</legend>
              <div className={styles.options}>
                {GENDERS.map((g) => (
                  <label key={g.value} className={styles.option}>
                    <input type="radio" name="gender" value={g.value} checked={form.gender === g.value} onChange={() => update({ gender: g.value })} />
                    {g.label}
                  </label>
                ))}
              </div>
              {form.gender === 'custom' && (
                <div className={styles.genderText}>
                  <label htmlFor="gender-text" className="sr-only">Your gender</label>
                  <input id="gender-text" name="gender" autoComplete="off" className="input" maxLength={40} autoFocus placeholder="How you describe your gender…" value={form.genderText} onChange={(e) => update({ genderText: e.target.value })} />
                </div>
              )}
            </fieldset>
          </section>

          <section className={`surface tint ${styles.section}`} style={{ '--hue': 'var(--a-teal)' }} aria-labelledby="units-title">
            <h2 id="units-title" className={styles.sectionTitle}><span className={styles.titleIcon} aria-hidden="true"><Ruler size={17} /></span>Units</h2>
            <div className={styles.segment} role="radiogroup" aria-labelledby="units-title">
              {[['metric', 'Metric', 'cm, kg'], ['imperial', 'Imperial', 'ft and in, lb']].map(([value, label, hint]) => (
                <label key={value} className={styles.segmentItem}>
                  <input type="radio" name="units" value={value} checked={form.units === value} onChange={() => switchUnits(value)} />
                  <span>{label}</span>
                  <span className={styles.segmentHint}>{hint}</span>
                </label>
              ))}
            </div>
            <p className={styles.help}>For your height and weight here, and for lifting weights in Fitness.</p>
          </section>

          <section className={`surface tint ${styles.section}`} style={{ '--hue': 'var(--t-water)' }} aria-labelledby="body-title">
            <h2 id="body-title" className={styles.sectionTitle}><span className={styles.titleIcon} aria-hidden="true"><Scale size={17} /></span>Body</h2>
            <div className={styles.body}>
              <div className={styles.field}>
                <label htmlFor="age" className="field-label">Age</label>
                <input id="age" name="age" autoComplete="off" className="input" type="number" inputMode="numeric" min={13} max={120} placeholder="Years" value={form.age} onChange={(e) => update({ age: e.target.value })} />
              </div>
              {imperial ? (
                <fieldset className={styles.field}>
                  <legend className="field-label">Height</legend>
                  <div className={styles.pair}>
                    <label className={styles.suffix}>
                      <span className="sr-only">Feet</span>
                      <input name="feet" autoComplete="off" className="input" type="number" inputMode="numeric" min={3} max={8} value={form.feet} onChange={(e) => update({ feet: e.target.value })} />
                      <span aria-hidden="true">ft</span>
                    </label>
                    <label className={styles.suffix}>
                      <span className="sr-only">Inches</span>
                      <input name="inches" autoComplete="off" className="input" type="number" inputMode="numeric" min={0} max={11} value={form.inches} onChange={(e) => update({ inches: e.target.value })} />
                      <span aria-hidden="true">in</span>
                    </label>
                  </div>
                </fieldset>
              ) : (
                <div className={styles.field}>
                  <label htmlFor="height" className="field-label">Height</label>
                  <span className={styles.suffix}>
                    <input id="height" name="height" autoComplete="off" className="input" type="number" inputMode="decimal" min={100} max={250} step="any" value={form.height} onChange={(e) => update({ height: e.target.value })} />
                    <span aria-hidden="true">cm</span>
                  </span>
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="weight" className="field-label">Weight</label>
                <span className={styles.suffix}>
                  <input id="weight" name="weight" autoComplete="off" className="input" type="number" inputMode="decimal" step="any" value={form.weight} onChange={(e) => update({ weight: e.target.value })} />
                  <span aria-hidden="true">{imperial ? 'lb' : 'kg'}</span>
                </span>
              </div>
            </div>
            <p className={styles.help}>Optional. Libra uses these for meal and training suggestions.</p>
          </section>

          <section className={`surface tint ${styles.section}`} style={{ '--hue': 'var(--t-workout)' }} aria-labelledby="goals-title">
            <div className={styles.sectionHead}>
              <h2 id="goals-title" className={styles.sectionTitle}><span className={styles.titleIcon} aria-hidden="true"><Target size={17} /></span>Goals</h2>
              <Link href={href('/dashboard')} className={styles.inlineLink}>Edit trackers on Today</Link>
            </div>
            <div className={styles.goalRow} style={{ '--hue': 'var(--t-workout)' }}>
              <span className={styles.goalName}>
                <span className={styles.goalIcon}><Dumbbell size={16} aria-hidden="true" /></span>
                Training sessions a week
              </span>
              <Stepper id="weekly-sessions" label="training sessions a week" value={String(form.weekly_sessions)} step={1} min={0} unit="sessions" onChange={(v) => update({ weekly_sessions: v === '' ? '' : v })} />
            </div>
            {trackers.length === 0 ? (
              <p className={styles.help}>Daily goals appear here once you have trackers.</p>
            ) : (
              <ul className={styles.goals} aria-label="Daily goals">
                {trackers.map((t) => {
                  const done = today[t.id] || 0
                  const target = Number(goals[t.id]) || t.target_value
                  return (
                  <li key={t.id} className={styles.goalRow} style={{ '--hue': getTrackerColor(t) }}>
                    <span className={styles.goalName}>
                      <span className={styles.goalIcon}>{createElement(getTrackerIcon(t.name), { size: 16, 'aria-hidden': true })}</span>
                      <span className={styles.goalLabel}>{t.name}<span className="faint">a day</span></span>
                    </span>
                    <Stepper
                      id={`goal-${t.id}`}
                      label={`daily goal for ${t.name}`}
                      value={goals[t.id] ?? ''}
                      step={getQuickSteps(t.unit)[0]}
                      unit={t.unit}
                      onChange={(v) => { setGoals({ ...goals, [t.id]: v }); setNotice(null) }}
                    />
                    <div className={styles.goalToday}>
                      <span className={styles.goalBar} aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(1, done / target)})` }} /></span>
                      <span className="tnum">Today {fmt(done)} of {fmt(target)} {t.unit}</span>
                    </div>
                  </li>
                  )
                })}
              </ul>
            )}
          </section>
        </fieldset>
      </div>

      {!isDemo && (
        <div className={styles.saveDock}>
          <div className={styles.saveBar} data-show={dirty || undefined}>
            <p className={styles.saveStatus} role="status">
              {notice?.error
                ? <span className={styles.saveError}><AlertCircle size={16} aria-hidden="true" />{notice.error}</span>
                : 'Unsaved changes'}
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForm(saved.form); setGoals(saved.goals); setNotice(null) }} disabled={saving}>Discard</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
          <p className={styles.toast} data-show={(toast && !dirty) || undefined} role="status">
            <Check size={16} strokeWidth={3} aria-hidden="true" />Saved
          </p>
        </div>
      )}

      {picking && (
        <dialog ref={pickerRef} className={styles.picker} aria-labelledby="avatar-title" onClose={() => setPicking(false)} onClick={(e) => { if (e.target === pickerRef.current) pickerRef.current.close() }}>
          <div className={styles.pickerInner}>
            <header className={styles.sectionHead}>
              <h2 id="avatar-title" className={styles.sectionTitle}>Pick an avatar</h2>
              <div className={styles.pickerActions}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSeeds([...(form.avatar_seed ? [form.avatar_seed] : []), ...randomSeeds(form.avatar_seed ? 11 : 12)])}>
                  <Shuffle size={15} aria-hidden="true" />Shuffle
                </button>
                <button type="button" className="icon-btn" onClick={() => pickerRef.current.close()} aria-label="Close"><X size={18} aria-hidden="true" /></button>
              </div>
            </header>
            <div className={styles.avatars} role="radiogroup" aria-labelledby="avatar-title">
              {seeds.map((seed, n) => (
                <button
                  key={seed}
                  type="button"
                  role="radio"
                  className={styles.avatar}
                  aria-checked={form.avatar_seed === seed}
                  aria-label={`Avatar ${n + 1}`}
                  onClick={() => pickAvatar(seed)}
                >
                  <img src={avatarUrl(seed)} alt="" width={72} height={72} loading="lazy" />
                  {form.avatar_seed === seed && <span className={styles.tick}><Check size={12} strokeWidth={3.5} aria-hidden="true" /></span>}
                </button>
              ))}
            </div>
            <p className={styles.help}>Picking one closes this. Save to keep it.</p>
          </div>
        </dialog>
      )}
    </form>
  )
}
