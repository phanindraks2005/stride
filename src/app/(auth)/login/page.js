'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { authMessage } from '@/lib/authErrors'
import AuthLayout from '@/components/auth/AuthLayout'
import Field from '@/components/auth/Field'
import { LoginVisual } from '@/components/auth/Visuals'
import styles from '@/components/auth/auth.module.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Already signed in: straight to today
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  async function handleLogin(e) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError(authMessage(error))
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <AuthLayout
      visual={<LoginVisual />}
      foot={<>Just looking? <Link href="/demo">Open the demo</Link>, no account needed.</>}
    >
      <h1 className={styles.title}><span>Welcome</span><span>back.</span></h1>
      <p className={styles.sub}>Log in to pick up your streak where you left it.</p>

      <form className={styles.form} onSubmit={handleLogin}>
        <Field label="Email" type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <Field label="Password" type="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <p className={styles.formError} role="alert">
            <AlertCircle size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
            <span>{error}</span>
          </p>
        )}
        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className={styles.switch}>New to Stride? <Link href="/signup">Create an account</Link></p>
    </AuthLayout>
  )
}
