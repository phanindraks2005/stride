'use client'
import { useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, MotionConfig } from 'framer-motion'
import LibraGlyph from '@/components/LibraGlyph'
import CountUp from '@/components/CountUp'
import { getTrackerColor } from '@/lib/trackerIcons'
import { useSequence } from './useSequence'
import styles from '@/app/page.module.css'

const EASE = [0.2, 0.8, 0.2, 1]
const ASK_1 = 'Log 300 ml water and 20 g protein'
const REPLY_1 = 'Done. Water is at 2,400 of 3,000 ml and protein at 124 g, so that one is closed for today. One more glass after dinner finishes water.'
const CHIPS = [{ tracker: 'Water', text: '+300 ml' }, { tracker: 'Protein', text: '+20 g' }]
const ASK_2 = 'Plan tomorrow’s workout, I’m sore from legs'
const PLAN = [
  { name: 'Bench press', sets: 4, reps: 8 },
  { name: 'Pull-ups', sets: 4, reps: 6 },
  { name: 'Overhead press', sets: 3, reps: 10 },
  { name: 'Face pulls', sets: 3, reps: 15 },
]
const WORDS = REPLY_1.split(' ')
const START = { step: 0, words: 0, chips: 0, rows: 0, glyph: 'idle' }
const END = { step: 6, words: WORDS.length, chips: CHIPS.length, rows: PLAN.length, glyph: 'idle' }

const bubble = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
}

// The conversation plays out like a live chat each time it scrolls into view
export default function LibraChat() {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.45 })
  const [s, setS] = useState(START)

  useSequence(inView, async (wait) => {
    let state = START
    const set = (patch) => { state = { ...state, ...patch }; setS(state) }
    set(START)
    await wait(350)
    set({ step: 1 })
    await wait(650)
    set({ step: 2, glyph: 'thinking' })
    await wait(1200)
    for (let i = 1; i <= WORDS.length; i++) {
      set({ step: 3, words: i })
      await wait(42)
    }
    set({ glyph: 'reply' })
    for (let i = 1; i <= CHIPS.length; i++) {
      await wait(220)
      set({ chips: i })
    }
    await wait(1100)
    set({ step: 4, glyph: 'idle' })
    await wait(650)
    set({ step: 5, glyph: 'thinking' })
    await wait(1100)
    set({ step: 6, glyph: 'reply' })
    for (let i = 1; i <= PLAN.length; i++) {
      await wait(280)
      set({ rows: i })
    }
  }, () => setS(END))

  return (
    <MotionConfig reducedMotion="user">
    <div ref={ref} className={`${styles.chat} surface`} aria-label="Example conversation with Libra" role="figure">
      <div className={styles.chatHead}>
        <LibraGlyph size={20} state={s.glyph} badge draw />
        <div>
          <p className={styles.chatName}>Libra</p>
          <p className={styles.chatStatus}>{s.glyph === 'thinking' ? 'Thinking…' : 'Reads your trackers, notes and workouts'}</p>
        </div>
      </div>

      <div className={styles.chatBody}>
        <AnimatePresence>
          {s.step >= 1 && <motion.p key="a1" className={styles.me} {...bubble}>{ASK_1}</motion.p>}

          {s.step === 2 && (
            <motion.div key="t1" className={styles.typing} {...bubble} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              <span /><span /><span />
            </motion.div>
          )}

          {s.step >= 3 && (
            <motion.div key="r1" className={styles.libra} {...bubble}>
              <p>{WORDS.slice(0, s.words).join(' ')}</p>
              <p className={styles.chips}>
                {CHIPS.slice(0, s.chips).map((c) => {
                  const hue = getTrackerColor(c.tracker)
                  return (
                    <motion.span
                      key={c.tracker}
                      className="chip"
                      style={{ background: `color-mix(in srgb, ${hue} 16%, transparent)`, color: hue }}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 520, damping: 22 } }}
                    >
                      {c.tracker} {c.text}
                    </motion.span>
                  )
                })}
              </p>
            </motion.div>
          )}

          {s.step >= 4 && <motion.p key="a2" className={styles.me} {...bubble}>{ASK_2}</motion.p>}

          {s.step === 5 && (
            <motion.div key="t2" className={styles.typing} {...bubble} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              <span /><span /><span />
            </motion.div>
          )}

          {s.step >= 6 && (
            <motion.div key="plan" className={styles.planCard} {...bubble}>
              <p className={styles.planTitle}>Upper body, 45 min</p>
              <ul>
                {PLAN.slice(0, s.rows).map((row) => (
                  <motion.li key={row.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } }}>
                    <span>{row.name}</span>
                    <span className="tnum"><CountUp value={row.sets} duration={500} /> × <CountUp value={row.reps} duration={700} /></span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </MotionConfig>
  )
}
