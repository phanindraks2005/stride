'use client'
import { useState } from 'react'
import { Check, Dumbbell, Plus, UtensilsCrossed } from 'lucide-react'
import Burst from '@/components/Burst'
import { getTrackerColor } from '@/lib/trackerIcons'
import styles from './libra.module.css'

// Ticks and "added" marks live in this browser only: they're a checklist, not data.
function useLocalSet(key) {
  const [set, setSet] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
    } catch {
      return new Set()
    }
  })
  function toggle(item, on = !set.has(item)) {
    const next = new Set(set)
    if (on) next.add(item)
    else next.delete(item)
    setSet(next)
    try { localStorage.setItem(key, JSON.stringify([...next])) } catch { /* private mode */ }
  }
  return [set, toggle]
}

export function WorkoutPlan({ plan, planKey, workoutTracker, onLog }) {
  const exercises = plan.exercises || []
  const [done, toggle] = useLocalSet(`libra-workout-${planKey}`)
  const [logged, setLogged] = useLocalSet(`libra-workout-logged-${planKey}`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const count = exercises.filter((_, i) => done.has(i)).length
  const complete = exercises.length > 0 && count === exercises.length
  const hue = workoutTracker ? getTrackerColor(workoutTracker) : 'var(--t-workout)'
  const minutes = Number(plan.duration_mins) || null

  async function logMinutes() {
    if (busy || !minutes) return
    setBusy(true)
    setError('')
    const result = await onLog(workoutTracker, minutes)
    setBusy(false)
    if (result?.error) setError(result.error)
    else setLogged('done', true)
  }

  return (
    <section className={`surface tint ${styles.plan}`} style={{ '--hue': hue }} aria-label={plan.title}>
      {complete && <Burst key="done" x="88%" y="28px" count={12} />}
      <header className={styles.planHead}>
        <span className={styles.planIcon}><Dumbbell size={18} aria-hidden="true" /></span>
        <div className={styles.planTitles}>
          <h3>{plan.title}</h3>
          <p className="faint">{exercises.length} exercises{minutes ? ` · about ${minutes} min` : ''}</p>
        </div>
        <span className={`${styles.planCount} tnum`} data-complete={complete || undefined}>{count}/{exercises.length}</span>
      </header>
      <div className={styles.planBar} aria-hidden="true"><i style={{ transform: `scaleX(${exercises.length ? count / exercises.length : 0})` }} /></div>
      <ul className={styles.planList}>
        {exercises.map((ex, i) => (
          <li key={i} style={{ animationDelay: `${i * 70}ms` }}>
            <label className={styles.exercise} data-done={done.has(i) || undefined}>
              <input type="checkbox" className="sr-only" checked={done.has(i)} onChange={() => toggle(i)} />
              <span className={styles.check} aria-hidden="true"><Check size={14} strokeWidth={3.2} /></span>
              <span className={styles.exName}>{ex.name}</span>
              <span className={`${styles.exMeta} tnum`}>{[ex.sets && `${ex.sets} sets`, ex.reps && `× ${ex.reps}`].filter(Boolean).join(' ')}</span>
            </label>
          </li>
        ))}
      </ul>
      {plan.note && <p className={styles.planNote}>{plan.note}</p>}
      {complete && workoutTracker && minutes && (
        <div className={styles.planFoot}>
          {logged.has('done') ? (
            <p className={styles.added}><Check size={15} strokeWidth={3} aria-hidden="true" />{minutes} {workoutTracker.unit} logged to {workoutTracker.name}</p>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={logMinutes} disabled={busy}>
              {busy ? 'Logging…' : `Log ${minutes} ${workoutTracker.unit} to ${workoutTracker.name}`}
            </button>
          )}
          {error && <p className="error-text" role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}

export function MealPlan({ plan, planKey, proteinTracker, caloriesTracker, onLog }) {
  const meals = plan.meals || []
  const [added, mark] = useLocalSet(`libra-meal-${planKey}`)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const hue = proteinTracker ? getTrackerColor(proteinTracker) : 'var(--t-protein)'
  const totalProtein = meals.reduce((n, m) => n + (Number(m.protein_g) || 0), 0)
  const totalKcal = meals.reduce((n, m) => n + (Number(m.calories) || 0), 0)
  const canLog = !!(proteinTracker || caloriesTracker)

  async function add(meal, i) {
    if (busy !== null) return
    setBusy(i)
    setError('')
    const writes = []
    if (proteinTracker && Number(meal.protein_g) > 0) writes.push([proteinTracker, Number(meal.protein_g)])
    if (caloriesTracker && Number(meal.calories) > 0) writes.push([caloriesTracker, Number(meal.calories)])
    for (const [tracker, value] of writes) {
      const result = await onLog(tracker, value)
      if (result?.error) {
        setError(result.error)
        setBusy(null)
        return
      }
    }
    mark(i, true)
    setBusy(null)
  }

  return (
    <section className={`surface tint ${styles.plan}`} style={{ '--hue': hue }} aria-label={plan.title}>
      <header className={styles.planHead}>
        <span className={styles.planIcon}><UtensilsCrossed size={18} aria-hidden="true" /></span>
        <div className={styles.planTitles}>
          <h3>{plan.title}</h3>
          <p className="faint tnum">
            {[totalProtein && `${totalProtein} g protein`, totalKcal && `${totalKcal.toLocaleString('en-US')} kcal`].filter(Boolean).join(' · ') || `${meals.length} items`}
          </p>
        </div>
      </header>
      <ul className={styles.planList}>
        {meals.map((meal, i) => {
          const isAdded = added.has(i)
          const loggable = (proteinTracker && meal.protein_g > 0) || (caloriesTracker && meal.calories > 0)
          return (
            <li key={i} className={styles.meal} style={{ animationDelay: `${i * 70}ms` }} data-done={isAdded || undefined}>
              <span className={styles.exName}>{meal.name}</span>
              <span className={styles.macros}>
                {meal.protein_g > 0 && <b className="tnum" style={{ color: proteinTracker ? getTrackerColor(proteinTracker) : undefined }}>{meal.protein_g} g</b>}
                {meal.calories > 0 && <span className="tnum" style={{ color: caloriesTracker ? getTrackerColor(caloriesTracker) : undefined }}>{meal.calories} kcal</span>}
              </span>
              {canLog && loggable && (
                isAdded ? (
                  <span className={styles.addedMark}><Check size={14} strokeWidth={3} aria-hidden="true" />Added</span>
                ) : (
                  <button type="button" className={styles.addMeal} onClick={() => add(meal, i)} disabled={busy !== null} aria-label={`Add ${meal.name} to today's logs`}>
                    <Plus size={15} aria-hidden="true" />{busy === i ? 'Adding' : 'Add'}
                  </button>
                )
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="error-text" role="alert">{error}</p>}
      {plan.note && <p className={styles.planNote}>{plan.note}</p>}
    </section>
  )
}
