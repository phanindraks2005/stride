'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { authMessage } from '@/lib/authErrors'
import AuthLayout from '@/components/auth/AuthLayout'
import Field from '@/components/auth/Field'
import { SignupVisual } from '@/components/auth/Visuals'
import styles from '@/components/auth/auth.module.css'

const MIN_PASSWORD = 8

const DEFAULT_TRACKERS = [
  { name: 'Water', unit: 'ml', target_value: 3000 },
  { name: 'Sleep', unit: 'hrs', target_value: 8 },
  { name: 'Workout', unit: 'mins', target_value: 30 },
  { name: 'Calories', unit: 'kcal', target_value: 2000 },
  { name: 'Protein', unit: 'g', target_value: 60 },
]

const DEFAULT_MUSCLE_GROUPS = [
  { name: 'Chest', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Push-ups', 'Chest Fly'] },
  { name: 'Back', exercises: ['Deadlift', 'Pull-ups', 'Bent Over Row', 'Lat Pulldown'] },
  { name: 'Biceps', exercises: ['Barbell Curl', 'Hammer Curl', 'Concentration Curl'] },
  { name: 'Triceps', exercises: ['Tricep Pushdown', 'Skull Crushers', 'Dips'] },
  { name: 'Legs', exercises: ['Squats', 'Lunges', 'Leg Press', 'Romanian Deadlift'] },
  { name: 'Abs', exercises: ['Plank', 'Crunches', 'Hanging Leg Raise', 'Russian Twist'] },
  { name: 'Cardio', exercises: ['Running', 'Cycling', 'Jump Rope', 'Rowing'] },
]

// The starter trackers and muscle groups every new account gets
async function seedAccount(userId) {
  const { error } = await supabase
    .from('trackers')
    .insert(DEFAULT_TRACKERS.map((t) => ({ ...t, user_id: userId, type: 'number' })))
  if (error) return error

  for (const group of DEFAULT_MUSCLE_GROUPS) {
    const { data: newGroup, error: groupError } = await supabase
      .from('muscle_groups')
      .insert({ user_id: userId, name: group.name })
      .select()
      .single()
    if (groupError) return groupError
    const { error: exError } = await supabase
      .from('exercises')
      .insert(group.exercises.map((name) => ({ user_id: userId, muscle_group_id: newGroup.id, name })))
    if (exError) return exError
  }
  return null
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmSent, setConfirmSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const longEnough = password.length >= MIN_PASSWORD

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  async function handleSignup(e) {
    e.preventDefault()
    if (loading) return
    if (!longEnough) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`)
      return
    }
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) {
      setError(authMessage(error))
      setLoading(false)
      return
    }

    // With email confirmation on there's no session yet, so nothing can be saved until they confirm
    if (!data.session) {
      setConfirmSent(true)
      setLoading(false)
      return
    }

    const seedError = await seedAccount(data.user.id)
    if (seedError) {
      setError('Your account is ready, but the starter trackers didn’t save. You can add them from the dashboard.')
      setLoading(false)
      setTimeout(() => router.push('/onboarding'), 2500)
      return
    }
    router.push('/onboarding')
  }

  return (
    <AuthLayout
      visual={<SignupVisual />}
      foot={<>Want to look around first? <Link href="/demo">Open the demo</Link>.</>}
    >
      <h1 className={styles.title}><span>Start your</span><span>streak.</span></h1>
      <p className={styles.sub}>Free. Five trackers and a full exercise list are ready the moment you sign up.</p>

      {confirmSent ? (
        <p className={styles.notice} role="status" style={{ marginTop: 32 }}>
          Check <b>{email.trim()}</b> for a link to confirm your account, then <Link href="/login">log in</Link>.
        </p>
      ) : (
        <form className={styles.form} onSubmit={handleSignup}>
          <Field label="Email" type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <Field
            label="Password"
            type="password"
            name="new-password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            hint={longEnough ? 'Good length.' : `At least ${MIN_PASSWORD} characters.`}
            hintOk={longEnough}
          />
          {error && (
            <p className={styles.formError} role="alert">
              <AlertCircle size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
              <span>{error}</span>
            </p>
          )}
          <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
            {loading ? 'Setting up your account…' : 'Create account'}
          </button>
        </form>
      )}

      <p className={styles.switch}>Already have an account? <Link href="/login">Log in</Link></p>
    </AuthLayout>
  )
}
