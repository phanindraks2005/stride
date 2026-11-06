'use client'
import { useMemo, useRef, useState } from 'react'
import { motion, useInView, MotionConfig } from 'framer-motion'
import { Check } from 'lucide-react'
import StreakCard from '@/components/today/StreakCard'
import TrackerCard from '@/components/today/TrackerCard'
import { getTrackerColor } from '@/lib/trackerIcons'
import { useMounted } from '@/lib/useMounted'
import { demoTrackers, demoTotals, demoStreak } from '@/lib/demoData'
import styles from '@/app/page.module.css'

const EASE = [0.2, 0.8, 0.2, 1]
const DEFAULTS = ['Water', 'Sleep', 'Workout', 'Calories', 'Protein']

function SignUpStep() {
  const ref = useRef(null)
  const shown = useInView(ref, { once: true, amount: 0.5 })
  return (
    <div ref={ref} className={styles.stepUi}>
      <p className="field-label">What should we call you?</p>
      <p className={styles.fakeInput}>Asha<span className={styles.caret} /></p>
      <p className="field-label" style={{ marginTop: 16 }}>Your first trackers</p>
      <ul className={styles.defaults}>
        {DEFAULTS.map((name, i) => (
          <motion.li
            key={name}
            style={{ '--hue': getTrackerColor(name) }}
            initial={{ opacity: 0, y: 8 }}
            animate={shown ? { opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.09, duration: 0.4, ease: EASE } } : undefined}
          >
            <Check size={13} strokeWidth={3} aria-hidden="true" />{name}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

// A real tracker card with a working +250 ml. It only changes this page; nothing is saved.
function LogStep() {
  const water = demoTrackers[0]
  const [total, setTotal] = useState(demoTotals()[water.id])
  return (
    <div className={styles.stepUi}>
      <TrackerCard
        tracker={water}
        total={total}
        onLog={async (v) => { setTotal((t) => t + v) }}
      />
      <p className={styles.tryIt}>Go on, press +250. Nothing here is saved.</p>
    </div>
  )
}

export default function HowItWorks() {
  const mounted = useMounted()
  const streak = useMemo(() => (mounted ? demoStreak() : null), [mounted])

  return (
    <MotionConfig reducedMotion="user">
      <ol className={styles.steps}>
        <li className="surface">
          <h3 className={styles.stepVerb}>Sign up</h3>
          <p className={styles.stepText}>Your name, a few numbers for your BMI if you like, and five trackers to start from.</p>
          <SignUpStep />
        </li>
        <li className="surface">
          <h3 className={styles.stepVerb}>Log</h3>
          <p className={styles.stepText}>Two taps on the dashboard, or one sentence to Libra.</p>
          {mounted && <LogStep />}
        </li>
        <li className="surface">
          <h3 className={styles.stepVerb}>Keep going</h3>
          <p className={styles.stepText}>Any logged day adds to the chain. Miss one and it starts again.</p>
          <div className={styles.stepUi}>{streak && <StreakCard compact {...streak} />}</div>
        </li>
      </ol>
    </MotionConfig>
  )
}
