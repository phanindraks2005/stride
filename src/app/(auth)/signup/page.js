'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const userId = data.user.id

    const defaultTrackers = [
      { user_id: userId, name: 'Water', unit: 'ml', target_value: 3000, type: 'number' },
      { user_id: userId, name: 'Sleep', unit: 'hrs', target_value: 8, type: 'number' },
      { user_id: userId, name: 'Workout', unit: 'mins', target_value: 30, type: 'number' },
      { user_id: userId, name: 'Calories', unit: 'kcal', target_value: 2000, type: 'number' },
      { user_id: userId, name: 'Protein', unit: 'g', target_value: 60, type: 'number' },
    ]

    const { error: trackerError } = await supabase.from('trackers').insert(defaultTrackers)

    const defaultMuscleGroups = [
      { name: 'Chest', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Push-ups', 'Chest Fly'] },
      { name: 'Back', exercises: ['Deadlift', 'Pull-ups', 'Bent Over Row', 'Lat Pulldown'] },
      { name: 'Biceps', exercises: ['Barbell Curl', 'Hammer Curl', 'Concentration Curl'] },
      { name: 'Triceps', exercises: ['Tricep Pushdown', 'Skull Crushers', 'Dips'] },
      { name: 'Legs', exercises: ['Squats', 'Lunges', 'Leg Press', 'Romanian Deadlift'] },
      { name: 'Abs', exercises: ['Plank', 'Crunches', 'Hanging Leg Raise', 'Russian Twist'] },
      { name: 'Cardio', exercises: ['Running', 'Cycling', 'Jump Rope', 'Rowing'] },
    ]

    for (const group of defaultMuscleGroups) {
      const { data: newGroup } = await supabase
        .from('muscle_groups')
        .insert({ user_id: userId, name: group.name })
        .select()
        .single()

      if (newGroup) {
        const exerciseRows = group.exercises.map((name) => ({
          user_id: userId,
          muscle_group_id: newGroup.id,
          name,
        }))
        await supabase.from('exercises').insert(exerciseRows)
      }
    }

    setLoading(false)

    if (trackerError) {
      setError('Account created, but tracker setup failed: ' + trackerError.message)
    } else {
      router.push('/onboarding')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundImage: `linear-gradient(rgba(10,10,15,0.55), rgba(10,10,15,0.75)), url('https://images.unsplash.com/photo-1637430308606-86576d8fef3c?fm=jpg&q=80&w=1600&auto=format&fit=crop')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '20px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '40px 36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <p className="font-serif" style={{ fontSize: '24px', marginBottom: '6px' }}>
          Stride<span style={{ color: 'var(--coral)' }}>.</span>
        </p>
        <h1 style={{ fontSize: '22px', marginBottom: '28px', color: 'var(--text-mid)', fontWeight: 400 }}>
          Create your account
        </h1>
        <form onSubmit={handleSignup}>
          <input
            style={{
              width: '100%', marginBottom: '14px', padding: '12px 16px',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', color: '#fff', fontSize: '14px', fontFamily: 'Space Grotesk, sans-serif',
            }}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={{
              width: '100%', marginBottom: '22px', padding: '12px 16px',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', color: '#fff', fontSize: '14px', fontFamily: 'Space Grotesk, sans-serif',
            }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p style={{ color: 'var(--coral)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              color: '#fff', fontWeight: 500, fontSize: '14px', cursor: 'pointer',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '13px', color: 'var(--text-mid)' }}>
          Already have an account? <a href="/login" style={{ color: 'var(--teal)' }}>Log in</a>
        </p>
      </div>
    </div>
  )
}