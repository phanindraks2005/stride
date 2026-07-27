'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showCalendar, setShowCalendar] = useState(false)
  const [userInitial, setUserInitial] = useState('')

  useEffect(() => {
    async function loadInitial() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

      const initial = profile?.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()
      setUserInitial(initial)
    }
    loadInitial()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const linkStyle = (path) => ({
    color: pathname === path ? 'var(--text-hi)' : 'var(--text-mid)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: pathname === path ? 500 : 400,
    paddingBottom: '4px',
    borderBottom: pathname === path ? '2px solid var(--violet)' : '2px solid transparent',
  })

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      maxWidth: '680px',
      margin: '0 auto',
      borderBottom: '1px solid var(--card-border)',
      position: 'sticky',
      top: 0,
      background: 'var(--bg)',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="22" height="22" viewBox="0 0 96 96">
            <defs>
              <linearGradient id="navLogoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7f5af0" />
                <stop offset="100%" stopColor="#ff6b4a" />
              </linearGradient>
            </defs>
            <circle cx="48" cy="48" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle
              cx="48" cy="48" r="34" fill="none" stroke="url(#navLogoGrad)"
              strokeWidth="6" strokeLinecap="round" strokeDasharray="150 214"
              transform="rotate(-90 48 48)"
            />
            <path
              d="M32 48 L40 48 L44 38 L52 58 L56 48 L64 48"
              fill="none" stroke="#2ce8c9" strokeWidth="4"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <span className="font-serif" style={{ fontSize: '18px' }}>
            Stride<span style={{ color: 'var(--coral)' }}>.</span>
          </span>
        </div>
        <Link href="/dashboard" style={linkStyle('/dashboard')}>Dashboard</Link>
        <Link href="/copilot" style={linkStyle('/copilot')}>Libra</Link>
        <Link href="/progress" style={linkStyle('/progress')}>Progress</Link>
        <Link href="/fitness" style={linkStyle('/fitness')}>Fitness</Link>
        <Link href="/notes" style={linkStyle('/notes')}>Notes</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-mid)', display: 'flex', alignItems: 'center', padding: '4px',
            }}
          >
            <CalendarIcon size={19} />
          </button>

          {showCalendar && (
            <div style={{
              position: 'absolute', top: '36px', right: 0, zIndex: 50,
              background: '#161620', border: '1px solid var(--card-border)',
              borderRadius: '14px', padding: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}>
              <DayPicker
                mode="single"
                onSelect={(date) => {
                  if (date) {
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const day = String(date.getDate()).padStart(2, '0')
                    const dateStr = `${year}-${month}-${day}`
                    setShowCalendar(false)
                    router.push(`/dashboard?date=${dateStr}`)
                  }
                }}
                disabled={{ after: new Date() }}
              />
            </div>
          )}
        </div>

        <Link
          href="/profile"
          style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: pathname === '/profile' ? 'linear-gradient(135deg, var(--violet), var(--coral))' : 'var(--card)',
            border: pathname === '/profile' ? 'none' : '1px solid var(--card-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '13px', fontWeight: 500, textDecoration: 'none',
            fontFamily: 'Space Grotesk, sans-serif',
          }}
        >
          {userInitial}
        </Link>

        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid var(--card-border)',
            color: 'var(--text-mid)',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </div>
    </div>
  )
}