import { supabase } from './supabase'
import { dayKey } from './streakCore'
import { getUnits, toShownWeight, weightUnit } from './units'

// One exercise_logs row is one entry: `sets` sets of `reps` reps at `weight` kg.
export function volumeOf(log) {
  return (log.sets || 0) * (log.reps || 0) * (log.weight || 0)
}

// Estimated one-rep max (Epley), for comparing a heavy triple with a lighter ten
export function oneRepMax(log) {
  if (!log.weight) return 0
  return log.reps > 1 ? log.weight * (1 + log.reps / 30) : log.weight
}

// Every exercise log, read in pages (Supabase caps one request at 1,000 rows)
export async function getExerciseLogs(userId) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('id, exercise_id, sets, reps, weight, logged_at')
      .eq('user_id', userId)
      .order('logged_at')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

// Ids of the logs that beat that exercise's heaviest weight at the time.
// The first entry for an exercise sets a baseline and isn't counted.
export function findPRs(logs) {
  const best = {}
  const prs = new Set()
  for (const log of [...logs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))) {
    const w = log.weight || 0
    if (w <= 0) continue
    if (best[log.exercise_id] !== undefined && w > best[log.exercise_id]) prs.add(log.id)
    if (best[log.exercise_id] === undefined || w > best[log.exercise_id]) best[log.exercise_id] = w
  }
  return prs
}

// Monday 00:00 of the week `date` is in
export function weekStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

// Total volume per week for the last `count` weeks, oldest first
export function weeklyVolume(logs, count = 8, today = new Date()) {
  const thisWeek = weekStart(today)
  const weeks = Array.from({ length: count }, (_, i) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - (count - 1 - i) * 7)
    return { start, volume: 0, sets: 0 }
  })
  for (const log of logs) {
    const ws = weekStart(log.logged_at).getTime()
    const w = weeks.find((x) => x.start.getTime() === ws)
    if (w) {
      w.volume += volumeOf(log)
      w.sets += log.sets || 0
    }
  }
  return weeks.map((w, i) => ({
    ...w,
    label: i === count - 1 ? 'This wk' : w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))
}

// Logs grouped by day, newest day first: [{ key, date, logs }]
export function byDay(logs) {
  const map = new Map()
  for (const log of logs) {
    const key = dayKey(log.logged_at)
    if (!map.has(key)) map.set(key, { key, date: new Date(log.logged_at), logs: [] })
    map.get(key).logs.push(log)
  }
  return [...map.values()].sort((a, b) => b.date - a.date)
}

export function sinceDays(n, today = new Date()) {
  const d = new Date(today)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (n - 1))
  return d
}

export function relativeDay(date, today = new Date()) {
  const a = new Date(date)
  a.setHours(0, 0, 0, 0)
  const b = new Date(today)
  b.setHours(0, 0, 0, 0)
  const days = Math.round((b - a) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// A weight stored in kg, shown in the unit picked on the profile
export function kg(n) {
  const units = getUnits()
  return `${toShownWeight(Number(n || 0), units).toLocaleString('en-US', { maximumFractionDigits: 1 })} ${weightUnit(units)}`
}

export function todayParam(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export const DEFAULT_GROUPS = [
  { name: 'Chest', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Push-ups', 'Chest Fly'] },
  { name: 'Back', exercises: ['Deadlift', 'Pull-ups', 'Bent Over Row', 'Lat Pulldown'] },
  { name: 'Biceps', exercises: ['Barbell Curl', 'Hammer Curl', 'Concentration Curl'] },
  { name: 'Triceps', exercises: ['Tricep Pushdown', 'Skull Crushers', 'Dips'] },
  { name: 'Legs', exercises: ['Squats', 'Lunges', 'Leg Press', 'Romanian Deadlift'] },
]
