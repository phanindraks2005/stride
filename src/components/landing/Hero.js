'use client'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Mark } from '@/components/Logo'
import LibraGlyph from '@/components/LibraGlyph'
import CountUp from '@/components/CountUp'
import StreakCard from '@/components/today/StreakCard'
import TrackerCard from '@/components/today/TrackerCard'
import { useMounted } from '@/lib/useMounted'
import { demoTrackers, demoTotals, demoStreak } from '@/lib/demoData'
import { useSequence } from './useSequence'
import styles from '@/app/page.module.css'

const byName = (name) => demoTrackers.find((t) => t.name === name)
const ASK = 'Log 300 ml water and 20 g protein'
const REPLY = 'Logged both. Protein is done for today.'

// Sample totals before and after Libra logs the message
const BEFORE = demoTotals()
const AFTER = { ...BEFORE, 1: BEFORE[1] + 300, 4: BEFORE[4] + 20 }

// Memoised: Libra typing re-renders the hero many times a second, the phone needn't follow
const Phone = memo(function Phone({ totals, streak }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div className={styles.phone} aria-hidden="true" inert>
      <div className={styles.screen}>
        <div className={styles.status}><span>9:41</span><span className={styles.island} /><span>100%</span></div>
        <div className={styles.screenHead}>
          <Mark size={22} />
          <div>
            <p className={styles.screenTitle}>Today</p>
            <p className={styles.screenDate}>{today}</p>
          </div>
        </div>
        <StreakCard compact {...streak} />
        <div className={styles.screenGrid}>
          {['Water', 'Protein', 'Sleep', 'Workout'].map((name, i) => (
            <TrackerCard key={name} compact readOnly index={i + 2} tracker={byName(name)} total={totals[byName(name).id]} />
          ))}
        </div>
        <div className={styles.screenTabs}>
          {['Today', 'Libra', 'Progress', 'Fitness', 'Notes'].map((t, i) => (
            <span key={t} data-active={i === 0 || undefined}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
})

// True once the browser has a quiet moment after hydrating
function useIdle() {
  const mounted = useMounted()
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!mounted) return
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 200))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = ric(() => setIdle(true), { timeout: 900 })
    return () => cancel(id)
  }, [mounted])
  return idle
}

export default function Hero() {
  const mounted = useIdle()
  const stageRef = useRef(null)
  const [totals, setTotals] = useState(BEFORE)
  const [chat, setChat] = useState({ asked: false, state: 'idle', typed: 0 })
  const streak = useMemo(() => (mounted ? demoStreak() : null), [mounted])

  // Libra takes a message, thinks, types its reply, and the phone updates
  useSequence(mounted, async (wait) => {
    await wait(1700)
    setChat({ asked: true, state: 'idle', typed: 0 })
    await wait(700)
    setChat({ asked: true, state: 'thinking', typed: 0 })
    await wait(1300)
    for (let i = 1; i <= REPLY.length; i++) {
      setChat({ asked: true, state: 'thinking', typed: i })
      await wait(26)
    }
    setChat({ asked: true, state: 'reply', typed: REPLY.length })
    await wait(250)
    setTotals(AFTER)
  }, () => {
    setChat({ asked: true, state: 'idle', typed: REPLY.length })
    setTotals(AFTER)
  })

  // Layers drift against the pointer on desktop
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    function onMove(e) {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = stage.getBoundingClientRect()
        stage.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        stage.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        {/* CSS-only line reveal, so the headline paints before the page hydrates */}
        <h1 className={styles.display}>
          <span className={styles.mask}><span>Don&apos;t break</span></span>
          <span className={styles.mask}><span>the chain.</span></span>
        </h1>
        <p className={styles.lead}>
          Stride tracks water, sleep, lifts and every habit you care about, and keeps your streak.
          Tell Libra, its AI coach, what you did and it logs it for you.
        </p>
        <div className={styles.ctas}>
          <Link prefetch={false} href="/signup" className="btn btn-primary btn-lg">Start free</Link>
          <Link prefetch={false} href="/demo" className="btn btn-secondary btn-lg">Try the demo <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <p className={styles.heroNote}>Free, no card. The demo needs no account.</p>
      </div>

      <div className={styles.heroStage} ref={stageRef}>
        <div className={styles.layerPhone}>
          {mounted ? <Phone totals={totals} streak={streak} /> : <div className={styles.phone} aria-hidden="true" />}
        </div>

        <div className={`${styles.layerFar} ${styles.floatStreak}`} aria-hidden="true">
          <span className="num">{mounted ? <CountUp value={streak.current} duration={1500} /> : 0}</span>
          <span>day streak<br /><span className="faint">best {streak?.best ?? ''}</span></span>
        </div>

        <div className={`${styles.layerNear} ${styles.floatLibra}`} data-on={chat.asked || undefined} aria-hidden="true">
          <p className={styles.floatAsk}>{ASK}</p>
          <p className={styles.floatReply}>
            <LibraGlyph size={18} state={chat.state} badge />
            <span>
              {REPLY.slice(0, chat.typed)}
              {chat.typed < REPLY.length && chat.state === 'thinking' && chat.typed > 0 && <span className={styles.caret} />}
              {chat.typed === 0 && <span className={styles.thinking}>Libra is thinking</span>}
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
