// Streak maths with no data access, so the landing page can use it without the Supabase client

export function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Streak from a set of logged day keys. If today has nothing yet, the streak
// still counts up to yesterday, so it doesn't reset just because today isn't over.
export function streakFromDays(loggedDays, today = new Date()) {
  const check = new Date(today)
  check.setHours(0, 0, 0, 0)
  if (!loggedDays.has(dayKey(check))) check.setDate(check.getDate() - 1)

  let current = 0
  while (loggedDays.has(dayKey(check))) {
    current++
    check.setDate(check.getDate() - 1)
  }

  // Longest run anywhere in the history
  const sorted = [...loggedDays].map((k) => {
    const [y, m, d] = k.split('-').map(Number)
    return new Date(y, m, d).getTime()
  }).sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev = null
  for (const t of sorted) {
    run = prev !== null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }

  // The last 14 days, oldest first, ending today
  const chain = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    chain.push({ date: d, logged: loggedDays.has(dayKey(d)), today: i === 0 })
  }

  return { current, best: Math.max(best, current), chain }
}

// The last `count` days, oldest first, ending today
export function lastDays(count, today = new Date()) {
  const days = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  return days
}
