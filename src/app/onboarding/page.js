'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [gender, setGender] = useState('')
  const [avatarSeed, setAvatarSeed] = useState('')

  function getAvatarOptions() {
    const style = gender === 'female' ? 'adventurer' : gender === 'male' ? 'adventurer' : 'adventurer'
    const seeds = ['Aiden', 'Sasha', 'Milo', 'Luna', 'Kai', 'Nova']
    return seeds.map((seed) => ({
      seed,
      url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`,
    }))
  }

  function calculateBMI() {
    if (!height || !weight) return null
    const heightM = height / 100
    return (weight / (heightM * heightM)).toFixed(1)
  }

  function getBMICategory(bmi) {
    if (bmi < 18.5) return { label: 'Underweight', color: 'var(--teal)' }
    if (bmi < 25) return { label: 'Healthy', color: '#4affc4' }
    if (bmi < 30) return { label: 'Overweight', color: 'var(--coral)' }
    return { label: 'Obese', color: '#ff6b9d' }
  }

  async function saveProfile(skip = false) {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('profiles').upsert({
      user_id: user.id,
      name: name || null,
      gender: gender || null,
      avatar_seed: avatarSeed || null,
      age: skip ? null : (age ? parseInt(age) : null),
      height_cm: skip ? null : (height ? parseFloat(height) : null),
      weight_kg: skip ? null : (weight ? parseFloat(weight) : null),
    })

    setLoading(false)
    router.push('/dashboard')
  }

  async function handleNameSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setStep(2)
  }

  function handleGenderAvatarSubmit() {
    setStep(3)
  }

  const bmi = calculateBMI()
  const bmiInfo = bmi ? getBMICategory(bmi) : null

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: '20px', padding: '40px 36px',
      }}>
        {step === 1 && (
          <form onSubmit={handleNameSubmit}>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
              Welcome to Stride
            </p>
            <h1 style={{ fontSize: '26px', marginBottom: '24px' }}>What should we call you?</h1>
            <input
              className="log-input"
              style={{ width: '100%', marginBottom: '20px' }}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" className="log-btn" style={{ width: '100%' }}>
              Continue
            </button>
          </form>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
              Nice to meet you, {name}
            </p>
            <h1 style={{ fontSize: '26px', marginBottom: '20px' }}>A bit about you</h1>

            <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '10px' }}>Gender</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              {['Male', 'Female'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g.toLowerCase())}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    background: gender === g.toLowerCase() ? 'linear-gradient(135deg, var(--violet), var(--coral))' : 'var(--card)',
                    border: gender === g.toLowerCase() ? 'none' : '1px solid var(--card-border)',
                    color: gender === g.toLowerCase() ? '#fff' : 'var(--text-mid)',
                    cursor: 'pointer', fontSize: '14px',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '10px' }}>Choose an avatar</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
              {getAvatarOptions().map((opt) => (
                <button
                  key={opt.seed}
                  onClick={() => setAvatarSeed(opt.seed)}
                  style={{
                    padding: '8px', borderRadius: '12px',
                    background: 'var(--card)',
                    border: avatarSeed === opt.seed ? '2px solid var(--violet)' : '1px solid var(--card-border)',
                    cursor: 'pointer',
                  }}
                >
                  <img src={opt.url} alt={opt.seed} style={{ width: '100%', borderRadius: '8px' }} />
                </button>
              ))}
            </div>

            <button onClick={handleGenderAvatarSubmit} className="log-btn" style={{ width: '100%' }}>
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
              Nice to meet you, {name}
            </p>
            <h1 style={{ fontSize: '26px', marginBottom: '8px' }}>A few quick details</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '24px' }}>
              This helps Libra give you better suggestions. Totally optional.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <input
                className="log-input"
                style={{ flex: 1 }}
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              <input
                className="log-input"
                style={{ flex: 1 }}
                type="number"
                placeholder="Height (cm)"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
              <input
                className="log-input"
                style={{ flex: 1 }}
                type="number"
                placeholder="Weight (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            {bmi && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)',
                borderRadius: '12px', padding: '16px', marginBottom: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-low)' }}>Your BMI</p>
                  <p style={{ fontSize: '24px', fontFamily: 'Fraunces, serif' }}>{bmi}</p>
                </div>
                <span style={{ color: bmiInfo.color, fontSize: '13px', fontWeight: 500 }}>{bmiInfo.label}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => saveProfile(false)}
                disabled={loading}
                className="log-btn"
                style={{ flex: 1 }}
              >
                {loading ? 'Saving...' : 'Finish'}
              </button>
              <button
                onClick={() => saveProfile(true)}
                disabled={loading}
                style={{
                  background: 'transparent', border: '1px solid var(--card-border)',
                  color: 'var(--text-mid)', borderRadius: '10px', padding: '0 20px', cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}