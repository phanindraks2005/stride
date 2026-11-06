'use client'
import { createElement, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Check } from 'lucide-react'
import WaveFill from '@/components/WaveFill'
import CountUp from '@/components/CountUp'
import Burst from '@/components/Burst'
import { getTrackerColor, getTrackerIcon } from '@/lib/trackerIcons'
import { fmt, percentOf } from '@/components/today/format'
import { demoTrackers, demoTotals } from '@/lib/demoData'
import { useSequence } from './useSequence'
import styles from '@/app/page.module.css'

const TOTALS = demoTotals()
const WATER = demoTrackers[0]
const CARDS = [
  { tracker: WATER, area: 'water', depth: 1.4, speed: 5.2 },
  { tracker: demoTrackers[3], area: 'protein', depth: 0.7, speed: 6.6 },
  { tracker: demoTrackers[1], area: 'sleep', depth: 1, speed: 7.8 },
  { tracker: demoTrackers[5], area: 'reading', depth: 0.5, speed: 6 },
]

// Tilts toward the pointer and glows in the tracker's colour while hovered
function Tilt({ children, className, style }) {
  const ref = useRef(null)
  function onMove(e) {
    if (e.pointerType !== 'mouse') return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`)
    ref.current.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -8}deg`)
  }
  function onLeave() {
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--ry', '0deg')
  }
  return (
    <div ref={ref} className={className} style={style} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  )
}

function ShowcaseCard({ tracker, total, play, speed, pressing, withButton }) {
  const color = getTrackerColor(tracker.name)
  const pct = percentOf(total, tracker.target_value)
  const [prevPct, setPrevPct] = useState(pct)
  const [bursts, setBursts] = useState(0)
  if (pct !== prevPct) {
    setPrevPct(pct)
    if (prevPct < 100 && pct >= 100) setBursts(bursts + 1)
  }

  return (
    <Tilt className={styles.showCard} style={{ '--hue': color, '--glow': color }}>
      {bursts > 0 && <Burst key={bursts} x="80%" y="40%" />}
      <div className={styles.showHead}>
        <span className={styles.showIcon}>{createElement(getTrackerIcon(tracker.name), { size: 16, color, 'aria-hidden': true })}</span>
        <h3>{tracker.name}</h3>
        {pct >= 100 && <span className={styles.showDone}><Check size={13} strokeWidth={3.5} aria-hidden="true" />Done</span>}
      </div>
      <div className={styles.showVessel}>
        <WaveFill percent={play ? pct : 0} color={color} speed={speed} rise={false} />
        <p className={styles.showTotal}>
          <span className="num"><CountUp value={total} play={play} duration={1300} /></span>
          <span className={styles.showTarget}>/ {fmt(tracker.target_value)} {tracker.unit}</span>
        </p>
        <p className={styles.showPct}><CountUp value={Math.min(pct, 999)} play={play} duration={1300} />%</p>
        {withButton && (
          <span className={styles.showPress} data-pressing={pressing || undefined}>+250 ml</span>
        )}
      </div>
    </Tilt>
  )
}

function Layer({ progress, depth, area, children }) {
  const still = useReducedMotion()
  const y = useTransform(progress, [0, 1], still ? [0, 0] : [36 * depth, -36 * depth])
  return <motion.div className={styles.showLayer} data-area={area} style={{ y, gridArea: area }}>{children}</motion.div>
}

export default function TrackersShowcase() {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.15 })
  // Counts and levels play once and stay; only the +250 ml loop pauses off screen
  const played = useInView(ref, { amount: 0.15, once: true })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const [water, setWater] = useState(TOTALS[WATER.id])
  const [pressing, setPressing] = useState(false)

  // The +250 ml button presses itself until water is done, holds, then starts over
  useSequence(inView, async (wait) => {
    setWater(TOTALS[WATER.id])
    await wait(1900)
    for (;;) {
      let level = TOTALS[WATER.id]
      while (level < WATER.target_value) {
        setPressing(true)
        await wait(170)
        setPressing(false)
        level += 250
        setWater(level)
        await wait(1500)
      }
      await wait(2600)
      setWater(TOTALS[WATER.id])
      await wait(2200)
    }
  })

  return (
    <div ref={ref} className={styles.showGrid} aria-hidden="true">
      {CARDS.map(({ tracker, area, depth, speed }) => (
        <Layer key={tracker.id} progress={scrollYProgress} depth={depth} area={area}>
          <ShowcaseCard
            tracker={tracker}
            total={tracker.id === WATER.id ? water : TOTALS[tracker.id]}
            play={played}
            speed={speed}
            withButton={tracker.id === WATER.id}
            pressing={pressing}
          />
        </Layer>
      ))}
    </div>
  )
}
