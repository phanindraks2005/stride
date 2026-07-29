'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const slides = [
  {
    title: 'Your Dashboard',
    desc: 'Track daily habits like water, sleep, and protein. Log progress in seconds, edit or delete anytime, and watch your streak grow.',
    emoji: '📊',
  },
  {
    title: 'Libra, your copilot',
    desc: "Talk to Libra like a real coach. Ask it to log something, build you a meal or workout plan, or analyze how you're doing — it reads your real data.",
    emoji: '✨',
  },
  {
    title: 'Progress',
    desc: 'See your trends over the week, month, or year. Compare periods and spot patterns in what you\'re actually doing.',
    emoji: '📈',
  },
  {
    title: 'Fitness',
    desc: 'Organize workouts by muscle group. Pick your focus each day, log sets and reps, and let Libra analyze your training.',
    emoji: '💪',
  },
  {
    title: 'Notes',
    desc: 'A private journal for anything on your mind — training notes, meal ideas, reminders. Titled, searchable, all yours.',
    emoji: '📝',
  },
]

export default function ProductTour({ onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ has_seen_tour: true }).eq('user_id', user.id)
    }
    onComplete()
  }

  const slide = slides[step]
  const isLast = step === slides.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        maxWidth: '420px', width: '100%',
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: '20px', padding: '40px 36px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>{slide.emoji}</div>
        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>{slide.title}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: '1.6', marginBottom: '28px' }}>
          {slide.desc}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? '20px' : '6px', height: '6px', borderRadius: '100px',
                background: i === step ? 'linear-gradient(135deg, var(--violet), var(--coral))' : 'var(--card-border)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => (isLast ? finish() : setStep(step + 1))}
          className="log-btn"
          style={{ width: '100%', marginBottom: '12px' }}
        >
          {isLast ? "Let's go" : 'Next'}
        </button>
        <button
          onClick={finish}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-low)', fontSize: '13px', cursor: 'pointer' }}
        >
          Skip tour
        </button>
      </div>
    </div>
  )
}