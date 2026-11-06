'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AuthLayout from '@/components/auth/AuthLayout'
import Field from '@/components/auth/Field'
import authStyles from '@/components/auth/auth.module.css'
import styles from './onboarding.module.css'

// Same values as the profile page, which also takes a self-described gender
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
]
const SEEDS = ['Aiden', 'Sasha', 'Milo', 'Luna', 'Kai', 'Nova']
const avatarUrl = (seed) => `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`

// Sensible ranges; anything outside is almost certainly a typo
const LIMITS = {
  age: [13, 120, 'Age should be between 13 and 120.'],
  height: [100, 250, 'Height should be between 100 and 250 cm.'],
  weight: [25, 400, 'Weight should be between 25 and 400 kg.'],
}

function check(key, value) {
  if (value === '') return ''
  const n = Number(value)
  const [min, max, message] = LIMITS[key]
  return Number.isFinite(n) && n >= min && n <= max ? '' : message
}

function bmiOf(height, weight) {
  if (check('height', height) || check('weight', weight) || !height || !weight) return null
  const m = Number(height) / 100
  return Number(weight) / (m * m)
}

const BANDS = [
  { max: 18.5, label: 'Underweight', color: 'var(--t-water)' },
  { max: 25, label: 'Healthy range', color: 'var(--volt)' },
  { max: 30, label: 'Overweight', color: 'var(--t-calories)' },
  { max: Infinity, label: 'Obese', color: 'var(--t-workout)' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function Preview({ name, seed, age, height, weight, bmi }) {
  const band = bmi ? BANDS.find((b) => bmi < b.max) : null
  // Marker position across a 15–35 scale
  const pos = bmi ? Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100)) : 0

  return (
    <div className={styles.preview}>
      <div className={styles.previewCard}>
        <div className={styles.previewHead}>
          <span className={styles.previewAvatar}>
            {seed ? <img src={avatarUrl(seed)} alt="" width={64} height={64} /> : (name.trim()[0] || '?').toUpperCase()}
          </span>
          <div>
            <p className={styles.previewTitle}>Today</p>
            <p className={styles.previewSub}>{greeting()}{name.trim() ? `, ${name.trim()}` : ''}.</p>
          </div>
        </div>
        <dl className={styles.stats}>
          <div><dt>Age</dt><dd className="num">{age && !check('age', age) ? age : '–'}</dd></div>
          <div><dt>Height</dt><dd><span className="num">{height && !check('height', height) ? height : '–'}</span> cm</dd></div>
          <div><dt>Weight</dt><dd><span className="num">{weight && !check('weight', weight) ? weight : '–'}</span> kg</dd></div>
        </dl>
        <div className={styles.bmi} data-on={bmi ? '' : undefined}>
          <div className={styles.bmiTop}>
            <span>BMI</span>
            <span className="num" style={{ color: band?.color }}>{bmi ? bmi.toFixed(1) : '–'}</span>
            {band && <span className={styles.bmiBand} style={{ color: band.color }}>{band.label}</span>}
          </div>
          <div className={styles.scale}>
            <i style={{ flex: 3.5, background: 'var(--t-water)' }} />
            <i style={{ flex: 6.5, background: 'var(--volt)' }} />
            <i style={{ flex: 5, background: 'var(--t-calories)' }} />
            <i style={{ flex: 5, background: 'var(--t-workout)' }} />
            {bmi && <b style={{ left: `${pos}%` }} />}
          </div>
        </div>
      </div>
      <p className={authStyles.visualCaption}>This is how Libra will know you. Change any of it later in your profile.</p>
    </div>
  )
}

export default function Onboarding() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [gender, setGender] = useState(null)
  const [seed, setSeed] = useState('')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Signed-out visitors go to log in; anyone who already finished goes to today
  useEffect(() => {
    async function gate() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data } = await supabase.from('profiles').select('name').eq('user_id', session.user.id).maybeSingle()
      if (data?.name) return router.replace('/dashboard')
      setReady(true)
    }
    gate()
  }, [router])

  const bmi = bmiOf(height, weight)
  const errors = { age: check('age', age), height: check('height', height), weight: check('weight', weight) }

  async function save(withDetails) {
    if (saving) return
    if (withDetails && (errors.age || errors.height || errors.weight)) return
    setSaving(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace('/login')
    const { error } = await supabase.from('profiles').upsert({
      user_id: session.user.id,
      name: name.trim(),
      gender: gender || null,
      avatar_seed: seed || null,
      age: withDetails && age ? parseInt(age, 10) : null,
      height_cm: withDetails && height ? parseFloat(height) : null,
      weight_kg: withDetails && weight ? parseFloat(weight) : null,
    }, { onConflict: 'user_id' })
    if (error) {
      setError('Couldn’t save your profile. Check your connection and try again.')
      setSaving(false)
      return
    }
    router.push('/dashboard')
  }

  if (!ready) return <div style={{ minHeight: '100vh' }} aria-busy="true" />

  const titles = {
    1: ['What should', 'we call you?'],
    2: ['Pick your', 'look.'],
    3: ['A few', 'numbers.'],
  }

  return (
    <AuthLayout visual={<Preview name={name} seed={seed} age={age} height={height} weight={weight} bmi={bmi} />}>
      <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((n) => <i key={n} data-on={n <= step || undefined} />)}
      </div>
      <div className={styles.stepTop}>
        {step > 1 && (
          <button type="button" className={styles.back} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} aria-hidden="true" />Back
          </button>
        )}
        <span className={styles.count}>Step {step} of 3</span>
      </div>

      <h1 key={step} className={authStyles.title}>
        <span>{titles[step][0]}</span><span>{titles[step][1]}</span>
      </h1>

      {step === 1 && (
        <form className={authStyles.form} onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep(2) }}>
          <p className={authStyles.sub} style={{ marginTop: -16 }}>Libra and the dashboard will use it.</p>
          <Field label="Your name" name="name" autoComplete="given-name" maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="submit" className={`btn btn-primary ${authStyles.submit}`} disabled={!name.trim()}>Continue</button>
        </form>
      )}

      {step === 2 && (
        <div className={authStyles.form}>
          <fieldset className={styles.group}>
            <legend className="field-label">Gender</legend>
            <div className={styles.options}>
              {GENDERS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  className={styles.option}
                  aria-pressed={gender === g.value}
                  onClick={() => setGender(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.group}>
            <legend className="field-label">Avatar</legend>
            <div className={styles.avatars}>
              {SEEDS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className={styles.avatar}
                  aria-pressed={seed === s}
                  aria-label={`Avatar ${i + 1}`}
                  onClick={() => setSeed(s)}
                >
                  <img src={avatarUrl(s)} alt="" width={72} height={72} />
                  {seed === s && <span className={styles.tick}><Check size={13} strokeWidth={3.5} aria-hidden="true" /></span>}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="button" className={`btn btn-primary ${authStyles.submit}`} onClick={() => setStep(3)}>Continue</button>
        </div>
      )}

      {step === 3 && (
        <form className={authStyles.form} onSubmit={(e) => { e.preventDefault(); save(true) }}>
          <p className={authStyles.sub} style={{ marginTop: -16 }}>Optional. Libra uses them for meal and training suggestions.</p>
          <div className={styles.numbers}>
            <Field label="Age" type="number" inputMode="numeric" name="age" min={13} max={120} value={age} onChange={(e) => setAge(e.target.value)} hint={errors.age || 'Years'} />
            <Field label="Height" type="number" inputMode="decimal" name="height" min={100} max={250} step="any" value={height} onChange={(e) => setHeight(e.target.value)} hint={errors.height || 'cm'} />
            <Field label="Weight" type="number" inputMode="decimal" name="weight" min={25} max={400} step="any" value={weight} onChange={(e) => setWeight(e.target.value)} hint={errors.weight || 'kg'} />
          </div>
          {(errors.age || errors.height || errors.weight) && (
            <p className={authStyles.formError} role="alert">
              <AlertCircle size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
              <span>{errors.age || errors.height || errors.weight}</span>
            </p>
          )}
          {error && (
            <p className={authStyles.formError} role="alert">
              <AlertCircle size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
              <span>{error}</span>
            </p>
          )}
          <div className={styles.finish}>
            <button type="submit" className={`btn btn-primary ${authStyles.submit}`} disabled={saving || Boolean(errors.age || errors.height || errors.weight)}>
              {saving ? 'Saving…' : 'Finish'}
            </button>
            <button type="button" className={`btn btn-ghost ${authStyles.submit}`} onClick={() => save(false)} disabled={saving}>Skip for now</button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
