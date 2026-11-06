// An in-memory stand-in for the Supabase client, used on /demo. It serves a
// sample account built from demoData.js (dates relative to today) and refuses
// every write, so the real pages run read-only without touching the network.

import { demoByDay, demoEntries, demoProfile, demoTrackers, seeded } from './demoData'

// The sample account's muscle groups (a little richer than the sign-up defaults)
const GROUPS = [
  { name: 'Chest', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Push-ups', 'Chest Fly'] },
  { name: 'Back', exercises: ['Deadlift', 'Pull-ups', 'Bent Over Row', 'Lat Pulldown'] },
  { name: 'Shoulders', exercises: ['Overhead Press', 'Lateral Raise', 'Face Pull'] },
  { name: 'Biceps', exercises: ['Barbell Curl', 'Hammer Curl'] },
  { name: 'Triceps', exercises: ['Tricep Pushdown', 'Skull Crushers', 'Dips'] },
  { name: 'Legs', exercises: ['Squats', 'Romanian Deadlift', 'Leg Press', 'Lunges'] },
  { name: 'Core', exercises: ['Plank', 'Hanging Leg Raise'] },
]

const USER_ID = 'demo'
const READ_ONLY = { message: 'The demo is read-only.', code: 'DEMO_READ_ONLY' }

function at(daysAgo, hhmm, today) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(today)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// How a day's total for each tracker is split into entries, and when
const PATTERNS = {
  Water: ['07:10', '10:20', '13:00', '16:15', '19:40'],
  Sleep: ['06:50'],
  Workout: ['07:30'],
  Protein: ['08:05', '13:20', '19:30'],
  Calories: ['08:05', '13:20', '16:40', '19:30'],
  Reading: ['22:15'],
}

function buildLogs(today, rand) {
  const logs = []
  let id = 1
  const byDay = demoByDay(today)
  for (let i = 370; i >= 1; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const sums = byDay[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`]
    if (!sums) continue
    for (const t of demoTrackers) {
      const total = sums[t.id]
      if (!total) continue
      const times = PATTERNS[t.name].slice(0, Math.max(1, Math.round(PATTERNS[t.name].length * (0.6 + rand() * 0.4))))
      let left = total
      times.forEach((time, n) => {
        const last = n === times.length - 1
        const share = last ? left : Math.round((total / times.length) * (0.8 + rand() * 0.4) * (t.name === 'Sleep' ? 4 : 1)) / (t.name === 'Sleep' ? 4 : 1)
        left -= share
        if (share > 0) logs.push({ id: id++, user_id: USER_ID, tracker_id: t.id, value: share, logged_at: at(i, time, today) })
      })
    }
  }
  for (const t of demoTrackers) {
    for (const e of demoEntries(t.id).reverse()) logs.push({ id: id++, user_id: USER_ID, tracker_id: t.id, value: e.value, logged_at: e.logged_at })
  }
  return logs
}

// A push / pull / legs / upper split over ten weeks, with steady progress
const PLAN = {
  push: [['Bench Press', 52.5, 4, 8], ['Incline Dumbbell Press', 18, 3, 10], ['Overhead Press', 32.5, 3, 8], ['Tricep Pushdown', 22.5, 3, 12]],
  pull: [['Deadlift', 85, 3, 5], ['Pull-ups', 0, 4, 8], ['Bent Over Row', 45, 4, 8], ['Barbell Curl', 25, 3, 10]],
  legs: [['Squats', 70, 4, 6], ['Romanian Deadlift', 60, 3, 8], ['Leg Press', 120, 3, 10], ['Lunges', 14, 3, 12]],
  upper: [['Bench Press', 50, 3, 10], ['Lat Pulldown', 50, 3, 10], ['Lateral Raise', 8, 3, 15], ['Hammer Curl', 12, 3, 12], ['Skull Crushers', 20, 3, 10]],
}
const WEEK = { 1: 'push', 2: 'pull', 4: 'legs', 6: 'upper' } // Mon, Tue, Thu, Sat

function buildTraining(today, rand) {
  const groups = GROUPS.map((g, i) => ({ id: i + 1, user_id: USER_ID, name: g.name, created_at: at(400, '09:00', today) }))
  const exercises = []
  GROUPS.forEach((g, gi) => g.exercises.forEach((name) => {
    exercises.push({ id: exercises.length + 1, user_id: USER_ID, muscle_group_id: gi + 1, name, created_at: at(400, '09:00', today) })
  }))
  const exerciseId = (name) => exercises.find((e) => e.name === name).id

  const logs = []
  for (let i = 70; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    // Today is always a push day, matching today's focus and the 45 workout minutes
    const day = i === 0 ? 'push' : WEEK[d.getDay()]
    if (!day || (i > 0 && rand() < 0.08)) continue
    const weeksIn = (70 - i) / 7
    PLAN[day].forEach(([name, start, sets, reps], n) => {
      // A small jump every eight weeks, staggered per exercise: a handful of PRs a month
      const bumps = Math.floor((weeksIn + n * 2.1 + day.length) / 8)
      const weight = start ? start + bumps * (start >= 20 ? 2.5 : 1) : 0
      logs.push({
        id: logs.length + 1, user_id: USER_ID, exercise_id: exerciseId(name), sets, reps: reps + (rand() < 0.2 ? 1 : 0),
        weight: weight || null, logged_at: at(i, `07:${String(32 + n * 9).padStart(2, '0')}`, today),
      })
    })
  }
  const focus = ['Chest', 'Triceps', 'Shoulders'].map((name) => ({
    user_id: USER_ID, muscle_group_id: groups.find((g) => g.name === name).id, selected_date: dateParam(today),
  }))
  return { groups, exercises, logs, focus }
}

function dateParam(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildNotes(today) {
  const notes = [
    [0, '07:05', 'Push day', 'Bench felt heavy on the warm-up but the top set of 8 moved fast. Shoulder is fine with the narrower grip. Next week: 4 × 8 again, then add 2.5 kg.'],
    [2, '21:40', 'Sleep experiment', 'Week 2 of no screens after 22:30. Average is up from 6.9 to 7.6 hours and I wake up before the alarm most days.\n\nKeep the book on the nightstand, phone charging in the kitchen.'],
    [5, '18:10', 'Meal prep Sunday', 'Chicken thighs, rice, roasted peppers, Greek yoghurt pots.\n\nFive lunches at about 42 g protein each covers most of the gap on weekdays.'],
    [9, '20:30', 'Deload next month?', 'Squat has stalled at the same weight for two sessions. Libra suggested a lighter week after the next block. Plan: 60% weights, same sets, focus on depth.'],
    [16, '12:45', 'Half marathon', 'Sign-ups close in March. If I start running twice a week in January I have 14 weeks. Add a Steps tracker before then.'],
    [24, '08:20', 'Why I track water', 'Afternoon headaches stopped once I hit 3 litres consistently. The 15:00 glass matters most.'],
  ]
  return notes.map(([daysAgo, time, title, content], i) => ({
    id: i + 1, user_id: USER_ID, title, content, created_at: at(daysAgo, time, today),
  }))
}

// Libra's sleep summary, worked out from the sample logs so it matches Progress
function sleepReply(logs, today) {
  const sleep = demoTrackers.find((t) => t.name === 'Sleep')
  const perDay = {}
  for (const l of logs) {
    if (l.tracker_id !== sleep.id) continue
    const key = dateParam(new Date(l.logged_at))
    perDay[key] = (perDay[key] || 0) + l.value
  }
  const nights = (from, to) => {
    const out = []
    for (let i = from; i <= to; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const hours = perDay[dateParam(d)]
      if (hours) out.push({ date: d, hours })
    }
    return out
  }
  const week = nights(1, 7)
  const before = nights(8, 14)
  const avg = (list) => list.reduce((n, x) => n + x.hours, 0) / (list.length || 1)
  const fmt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })
  const best = week.reduce((a, b) => (b.hours > a.hours ? b : a), week[0])
  const worst = week.reduce((a, b) => (b.hours < a.hours ? b : a), week[0])
  const hit = week.filter((n) => n.hours >= sleep.target_value).length
  const day = (d) => d.toLocaleDateString('en-US', { weekday: 'long' })
  const change = avg(week) >= avg(before) ? `up from ${fmt(avg(before))}` : `down from ${fmt(avg(before))}`
  return `You averaged **${fmt(avg(week))} hours** over the last ${week.length} nights, ${change} the week before, and hit your 8-hour goal on ${hit} of them.\n\n- Longest: ${day(best.date)}, ${fmt(best.hours)} hours\n- Shortest: ${day(worst.date)}, ${fmt(worst.hours)} hours\n\nThe no-screens-after-22:30 experiment in your notes is worth keeping going.`
}

function buildMessages(today, logs) {
  const workout = {
    type: 'workout_plan',
    title: '30-minute push session',
    duration_mins: 30,
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '8' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10' },
      { name: 'Overhead Press', sets: 3, reps: '8' },
      { name: 'Tricep Pushdown', sets: 3, reps: '12' },
      { name: 'Push-ups', sets: 2, reps: 'to failure' },
    ],
    note: 'Rest 90 seconds between bench sets and 60 on the rest. If last week’s top set moved fast, add 2.5 kg to the first one.',
  }
  const meal = {
    type: 'meal_plan',
    title: 'High-protein dinner',
    meals: [
      { name: 'Grilled chicken thighs (200 g)', protein_g: 48, calories: 420 },
      { name: 'Jasmine rice (1 cup cooked)', protein_g: 4, calories: 205 },
      { name: 'Roasted peppers and broccoli', protein_g: 5, calories: 110 },
      { name: 'Greek yoghurt with honey', protein_g: 17, calories: 180 },
    ],
    note: 'That is 74 g of protein, enough to close today’s gap with room to spare, and about 915 kcal, which keeps you under 2,200.',
  }
  const thread = [
    [2, '19:05', 'user', 'Plan a high-protein dinner, I’m well short on protein today', null],
    [2, '19:05', 'assistant', 'Dinner can be generous: you have plenty of room left in calories. Here’s one that closes the protein gap in a single meal:', meal],
    [1, '08:12', 'user', 'How did I sleep this week?', null],
    [1, '08:12', 'assistant', sleepReply(logs, today), null],
    [0, '14:30', 'user', 'Log 300 ml water and 20 g protein', null],
    [0, '14:30', 'assistant', 'Done. Water is at 1,550 of 3,000 ml and protein at 92 of 120 g. Two more glasses before 17:00 keeps you on track for water.', {
      type: 'actions',
      actions: [
        { kind: 'log', tracker: 'Water', value: 300, unit: 'ml', success: true },
        { kind: 'log', tracker: 'Protein', value: 20, unit: 'g', success: true },
      ],
    }],
    [0, '14:34', 'user', 'Give me a 30-minute push workout for tomorrow', null],
    [0, '14:34', 'assistant', 'Here’s a push session that fits in 30 minutes. It starts with your bench press while you’re fresh and finishes with a pump set.', workout],
  ]
  return thread.map(([daysAgo, time, role, content, artifact], i) => ({
    id: i + 1, user_id: USER_ID, role, content, artifact, created_at: at(daysAgo, time, today),
  }))
}

function buildTables() {
  const today = new Date()
  const rand = seeded(7)
  const training = buildTraining(today, rand)
  const joined = at(400, '09:00', today)
  const logs = buildLogs(today, rand)
  return {
    user: { id: USER_ID, email: 'asha@example.com', created_at: joined },
    tables: {
      profiles: [{ user_id: USER_ID, ...demoProfile, gender: 'female', has_seen_tour: true, units: 'metric', weekly_sessions: 4, created_at: joined }],
      trackers: demoTrackers.map((t) => ({ ...t, user_id: USER_ID, type: 'number', color: null })),
      logs,
      muscle_groups: training.groups,
      exercises: training.exercises,
      exercise_logs: training.logs,
      daily_selections: training.focus,
      notes: buildNotes(today),
      messages: buildMessages(today, logs),
    },
  }
}

function compare(a, b) {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  return a < b ? -1 : 1
}

// Enough of PostgREST's query builder for the pages: filters, order, range, single
class Query {
  constructor(db, table) {
    this.db = db
    this.table = table
    this.filters = []
    this.orders = []
    this.from = 0
    this.to = Infinity
    this.mode = 'many'
    this.write = false
  }

  select() { return this }
  eq(col, v) { this.filters.push((r) => String(r[col]) === String(v)); return this }
  neq(col, v) { this.filters.push((r) => String(r[col]) !== String(v)); return this }
  gt(col, v) { this.filters.push((r) => r[col] > v); return this }
  gte(col, v) { this.filters.push((r) => r[col] >= v); return this }
  lt(col, v) { this.filters.push((r) => r[col] < v); return this }
  lte(col, v) { this.filters.push((r) => r[col] <= v); return this }
  in(col, list) { const set = new Set(list.map(String)); this.filters.push((r) => set.has(String(r[col]))); return this }
  ilike(col, pattern) {
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`, 'i')
    this.filters.push((r) => re.test(r[col] || ''))
    return this
  }
  order(col, { ascending = true } = {}) { this.orders.push([col, ascending]); return this }
  range(from, to) { this.from = from; this.to = to; return this }
  limit(n) { this.to = this.from + n - 1; return this }
  maybeSingle() { this.mode = 'maybe'; return this }
  single() { this.mode = 'one'; return this }
  insert() { this.write = true; return this }
  update() { this.write = true; return this }
  upsert() { this.write = true; return this }
  delete() { this.write = true; return this }

  run() {
    if (this.write) return { data: null, error: READ_ONLY }
    let rows = (this.db.tables[this.table] || []).filter((r) => this.filters.every((f) => f(r)))
    if (this.orders.length) {
      rows = [...rows].sort((a, b) => {
        for (const [col, asc] of this.orders) {
          const c = compare(a[col], b[col])
          if (c) return asc ? c : -c
        }
        return 0
      })
    }
    // Copies, so a page changing a row can't change the sample data
    rows = rows.slice(this.from, this.to + 1).map((r) => ({ ...r }))
    if (this.mode === 'maybe') return { data: rows[0] ?? null, error: null }
    if (this.mode === 'one') return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: 'Not found', code: 'PGRST116' } }
    return { data: rows, error: null }
  }

  then(resolve, reject) {
    return Promise.resolve().then(() => this.run()).then(resolve, reject)
  }
}

let client = null

export function demoClient() {
  if (client) return client
  const db = buildTables()
  const session = { access_token: 'demo', user: db.user }
  client = {
    from: (table) => new Query(db, table),
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: db.user }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }
  return client
}
