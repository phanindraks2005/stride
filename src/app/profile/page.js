'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [gender, setGender] = useState('')
  const [avatarSeed, setAvatarSeed] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setName(profile.name || '')
      setAge(profile.age || '')
      setHeight(profile.height_cm || '')
      setWeight(profile.weight_kg || '')
      setGender(profile.gender || '')
      setAvatarSeed(profile.avatar_seed || '')
    }
    setLoading(false)
  }

  function getAvatarOptions() {
    const seeds = ['Aiden', 'Sasha', 'Milo', 'Luna', 'Kai', 'Nova', 'Zoe', 'Leo', 'Maya']
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

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('profiles').upsert({
      user_id: user.id,
      name: name || null,
      gender: gender || null,
      avatar_seed: avatarSeed || null,
      age: age ? parseInt(age) : null,
      height_cm: height ? parseFloat(height) : null,
      weight_kg: weight ? parseFloat(weight) : null,
    }, { onConflict: 'user_id' })

    window.dispatchEvent(new Event('profileUpdated'))
    setSaving(false)
    setSaved(true)

    setTimeout(() => {
      router.push('/dashboard')
    }, 800)
  }

  const bmi = calculateBMI()
  const bmiInfo = bmi ? getBMICategory(bmi) : null

  if (loading) return (
    <div style={{ padding: '40px', color: 'var(--text-mid)' }}>Loading...</div>
  )

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '60px 24px' }}>
      <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
        Account
      </p>
      <h1 style={{ fontSize: '32px', marginBottom: '32px' }}>
        Your <span className="gradient-text">profile</span>
      </h1>

      <form onSubmit={handleSave} className="glass-card">
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '10px', display: 'block' }}>Avatar</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {getAvatarOptions().map((opt) => (
              <button
                key={opt.seed}
                type="button"
                onClick={() => setAvatarSeed(opt.seed)}
                style={{
                  padding: '6px', borderRadius: '10px',
                  background: 'var(--card)',
                  border: avatarSeed === opt.seed ? '2px solid var(--violet)' : '1px solid var(--card-border)',
                  cursor: 'pointer',
                }}
              >
                <img src={opt.url} alt={opt.seed} style={{ width: '100%', borderRadius: '6px' }} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '6px', display: 'block' }}>Gender</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Male', 'Female'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g.toLowerCase())}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
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
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '6px', display: 'block' }}>Name</label>
          <input
            className="log-input"
            style={{ width: '100%' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '6px', display: 'block' }}>Age</label>
            <input
              className="log-input"
              style={{ width: '100%' }}
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '6px', display: 'block' }}>Height (cm)</label>
            <input
              className="log-input"
              style={{ width: '100%' }}
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '6px', display: 'block' }}>Weight (kg)</label>
            <input
              className="log-input"
              style={{ width: '100%' }}
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>

        {bmi && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)',
            borderRadius: '12px', padding: '16px', marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-low)' }}>Your BMI</p>
                <p style={{ fontSize: '24px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>{bmi}</p>
              </div>
              <span style={{ color: bmiInfo.color, fontSize: '13px', fontWeight: 500 }}>{bmiInfo.label}</span>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {[
                { label: 'Underweight', range: 'Below 18.5', color: 'var(--teal)' },
                { label: 'Healthy', range: '18.5 – 24.9', color: '#4affc4' },
                { label: 'Overweight', range: '25 – 29.9', color: 'var(--coral)' },
                { label: 'Obese', range: '30 and above', color: '#ff6b9d' },
              ].map((cat) => (
                <div
                  key={cat.label}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px',
                    background: bmiInfo.label === cat.label ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: bmiInfo.label === cat.label ? `1px solid ${cat.color}` : '1px solid transparent',
                  }}
                >
                  <span style={{ color: bmiInfo.label === cat.label ? 'var(--text-hi)' : 'var(--text-mid)' }}>{cat.label}</span>
                  <span style={{ color: 'var(--text-low)' }}>{cat.range}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="log-btn" disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}