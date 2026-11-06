'use client'
import { useEffect, useRef, useState } from 'react'
import { LayoutGrid, LineChart, Dumbbell, NotebookPen } from 'lucide-react'
import LibraGlyph from '@/components/LibraGlyph'
import { supabase } from '@/lib/supabase'

const LibraIcon = ({ size }) => <LibraGlyph size={size + 4} draw inherit />

const slides = [
  {
    title: 'Today',
    desc: 'Your trackers for the day. Tap a quick-add button or type an amount, and keep the streak going by logging anything once a day.',
    icon: LayoutGrid,
    color: 'var(--t-water)',
  },
  {
    title: 'Libra, your coach',
    desc: 'Tell Libra what you did and it logs it. Ask for a meal plan, a workout, or how your week went. It reads your real data.',
    icon: LibraIcon,
    color: 'var(--volt)',
  },
  {
    title: 'Progress',
    desc: 'Week, month and year charts for every tracker, with this period compared to the last.',
    icon: LineChart,
    color: 'var(--t-sleep)',
  },
  {
    title: 'Fitness',
    desc: 'Pick today’s focus, log sets, reps and weight per exercise, and see what you lifted last time.',
    icon: Dumbbell,
    color: 'var(--t-workout)',
  },
  {
    title: 'Notes',
    desc: 'A private notebook for training notes, meal ideas and anything else. It saves as you type.',
    icon: NotebookPen,
    color: 'var(--t-protein)',
  },
]

export default function ProductTour({ onComplete }) {
  const [step, setStep] = useState(0)
  const dialogRef = useRef(null)
  const primaryRef = useRef(null)

  async function finish() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ has_seen_tour: true }).eq('user_id', user.id)
    }
    onComplete()
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    function onCancel(e) {
      e.preventDefault()
      finish()
    }
    dialog?.addEventListener('cancel', onCancel)
    return () => dialog?.removeEventListener('cancel', onCancel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { primaryRef.current?.focus() }, [step])

  const slide = slides[step]
  const isLast = step === slides.length - 1
  const Icon = slide.icon

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="tour-title"
      aria-describedby="tour-desc"
      style={{
        margin: 'auto', width: 'min(440px, calc(100vw - 32px))', border: 0, padding: 32,
        borderRadius: 24, background: 'var(--surface-1)', color: 'var(--ink)',
        boxShadow: '0 40px 100px -20px #000',
      }}
    >
      <style>{`dialog::backdrop { background: #0a0b0dd9; }`}</style>
      <div key={step} style={{ animation: 'rise .4s var(--ease) both' }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${slide.color} 16%, transparent)`, color: slide.color }}>
          <Icon size={24} aria-hidden="true" />
        </span>
        <p style={{ marginTop: 22, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }} className="tnum">
          {step + 1} of {slides.length}
        </p>
        <h2 id="tour-title" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4 }}>{slide.title}</h2>
        <p id="tour-desc" style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink-2)', marginTop: 10, minHeight: 75 }}>{slide.desc}</p>
      </div>

      <div style={{ display: 'flex', gap: 6, margin: '22px 0' }} aria-hidden="true">
        {slides.map((_, i) => (
          <span key={i} style={{ height: 4, flex: 1, borderRadius: 99, background: i <= step ? 'var(--volt)' : 'var(--surface-3)', transition: 'background-color .3s var(--ease)' }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button ref={primaryRef} type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => (isLast ? finish() : setStep(step + 1))}>
          {isLast ? 'Start logging' : 'Next'}
        </button>
        {!isLast && <button type="button" className="btn btn-ghost" onClick={finish}>Skip</button>}
      </div>
    </dialog>
  )
}
