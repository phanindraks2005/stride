// Sample account used by the landing page mockups and the read-only /demo.
// Everything is relative to "now" so the demo always looks current.

import { streakFromDays, dayKey } from './streakCore'

export const demoProfile = { name: 'Asha', avatar_seed: 'sunny', age: 27, height_cm: 168, weight_kg: 61 }

export const demoTrackers = [
  { id: 1, name: 'Water', unit: 'ml', target_value: 3000 },
  { id: 2, name: 'Sleep', unit: 'hrs', target_value: 8 },
  { id: 3, name: 'Workout', unit: 'mins', target_value: 45 },
  { id: 4, name: 'Protein', unit: 'g', target_value: 120 },
  { id: 5, name: 'Calories', unit: 'kcal', target_value: 2200 },
  { id: 6, name: 'Reading', unit: 'mins', target_value: 30 },
]

// Today's entries per tracker: [value, "HH:MM"]
const todayEntries = {
  1: [[500, '07:10'], [250, '09:40'], [500, '12:15'], [300, '14:30'], [550, '17:05']],
  2: [[7.5, '06:45']],
  3: [[45, '07:30']],
  4: [[30, '08:00'], [42, '13:10'], [20, '14:30'], [12, '16:40']],
  5: [[420, '08:00'], [690, '13:10'], [250, '16:40'], [500, '19:30']],
  6: [[15, '22:10']],
}

function at(hhmm, daysAgo = 0) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function demoEntries(trackerId) {
  return (todayEntries[trackerId] || [])
    .map(([value, time], i) => ({ id: `${trackerId}-${i}`, tracker_id: trackerId, value, logged_at: at(time) }))
    .reverse()
}

export function demoTotals() {
  const totals = {}
  for (const t of demoTrackers) {
    totals[t.id] = (todayEntries[t.id] || []).reduce((sum, [v]) => sum + v, 0)
  }
  return totals
}

// A seeded random sequence in [0, 1), so the sample year looks the same on every visit
export function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296)
  }
}

// A year of sample logs as { dayKey: { trackerId: total } }: a 23-day current streak,
// two missed days, a 31-day run before that, and an ordinary year before that.
export function demoByDay(today = new Date()) {
  const rand = seeded(42)
  const byDay = {}
  let run = 0
  for (let i = 370; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    let logged
    if (i === 0) { byDay[dayKey(d)] = demoTotals(); continue }
    if (i < 23 || (i >= 25 && i <= 55)) logged = true
    else if (i === 23 || i === 24 || i === 56) logged = false
    else logged = run < 26 && rand() < 0.8
    run = logged ? run + 1 : 0
    if (!logged) { rand(); continue }
    const sums = {}
    for (const t of demoTrackers) {
      const r = rand()
      if (r < 0.12) continue
      // Most days land near the target; the closer to now, the steadier
      const steadiness = i < 14 ? 0.74 : i < 60 ? 0.62 : 0.45
      // Sleep never swings as far as the rest: short nights, not missing ones
      const short = t.name === 'Sleep' ? 0.78 + rand() * 0.2 : 0.4 + rand() * 0.5
      const value = t.target_value * (r < steadiness + 0.12 ? 1 + rand() * 0.15 : short)
      sums[t.id] = t.name === 'Sleep' ? Math.round(value * 4) / 4 : Math.round(value)
    }
    byDay[dayKey(d)] = sums
  }
  return byDay
}

// Built once per day per page load; several landing sections share it
let cached = null
export function demoStreak() {
  const key = dayKey(new Date())
  if (cached?.key !== key) {
    const byDay = demoByDay()
    cached = { key, value: { ...streakFromDays(new Set(Object.keys(byDay))), byDay } }
  }
  return cached.value
}

// Last 7 days of water (ml), oldest first, for small charts
export const demoWaterWeek = [2600, 3100, 2900, 3200, 2400, 3050, 2100]

export const demoChat = [
  { role: 'user', content: 'Log 300 ml water and 20 g protein' },
  {
    role: 'assistant',
    content: 'Done. Water is at 2,400 of 3,000 ml and protein at 124 g, so that one is closed for today. One more glass after dinner finishes water.',
    actions: [{ tracker: 'Water', text: '+300 ml' }, { tracker: 'Protein', text: '+20 g' }],
  },
]

export const demoLifts = [
  { exercise: 'Bench Press', sets: 4, reps: 8, weight: 60, note: '+2.5 kg on last week' },
  { exercise: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 22 },
  { exercise: 'Chest Fly', sets: 3, reps: 12, weight: 14 },
]
