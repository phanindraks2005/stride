'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
backgroundImage: `linear-gradient(rgba(10,10,15,0.55), rgba(10,10,15,0.75)), url('https://images.unsplash.com/photo-1778828494354-9b717d36dc99?fm=jpg&q=80&w=1600&auto=format&fit=crop')`,      backgroundSize: 'cover',
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
          Welcome back
        </h1>
        <form onSubmit={handleLogin}>
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
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '13px', color: 'var(--text-mid)' }}>
          Don't have an account? <a href="/signup" style={{ color: 'var(--teal)' }}>Sign up</a>
        </p>
      </div>
    </div>
  )
}