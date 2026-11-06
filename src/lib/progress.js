import { dayKey, lastDays } from './streakCore'

// Everything on the Progress page comes from one byDay map
// ({ dayKey: { trackerId: total } }, see getStreakStats), worked out here.

export const PERIODS = {
  week: { label: 'Week', days: 7, phrase: 'the last 7 days', prev: 'the week before' },
  month: { label: 'Month', days: 30, phrase: 'the last 30 days', prev: 'the 30 days before' },
  year: { label: 'Year', days: 365, phrase: 'the last 12 months', prev: 'the year before' },
}

function daysEnding(count, end) {
  return lastDays(count, end)
}

function before(days, count) {
  const end = new Date(days[0])
  end.setDate(end.getDate() - 1)
  return daysEnding(count, end)
}

function sumFor(byDay, trackerId, days) {
  return days.reduce((n, d) => n + (byDay[dayKey(d)]?.[trackerId] || 0), 0)
}

function goalDays(byDay, tracker, days) {
  return days.filter((d) => tracker.target_value > 0 && (byDay[dayKey(d)]?.[tracker.id] || 0) >= tracker.target_value).length
}

// Chart points: one per day for week/month, one per month (average a day) for the year
export function series(byDay, tracker, period, today = new Date()) {
  if (period !== 'year') {
    return daysEnding(PERIODS[period].days, today).map((d) => {
      const value = byDay[dayKey(d)]?.[tracker.id] || 0
      return {
        label: period === 'week' ? d.toLocaleDateString('en-US', { weekday: 'short' }) : String(d.getDate()),
        full: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        value: Math.round(value * 100) / 100,
        hit: tracker.target_value > 0 && value >= tracker.target_value,
      }
    })
  }
  const points = []
  for (let i = 11; i >= 0; i--) {
    const first = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const last = i === 0 ? new Date(today) : new Date(today.getFullYear(), today.getMonth() - i + 1, 0)
    const days = daysEnding(Math.round((last - first) / 86400000) + 1, last)
    const avg = sumFor(byDay, tracker.id, days) / days.length
    points.push({
      label: first.toLocaleDateString('en-US', { month: 'short' }),
      full: `${first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}, average a day`,
      value: Math.round(avg * 10) / 10,
      hit: tracker.target_value > 0 && avg >= tracker.target_value,
    })
  }
  return points
}

// Totals for one tracker in the period and the one before it
export function summary(byDay, tracker, period, today = new Date()) {
  const count = PERIODS[period].days
  const days = daysEnding(count, today)
  const prevDays = before(days, count)
  const total = sumFor(byDay, tracker.id, days)
  const prevTotal = sumFor(byDay, tracker.id, prevDays)
  // A previous period with only a few logged days makes any % meaningless
  const prevLogged = prevDays.filter((d) => byDay[dayKey(d)]?.[tracker.id]).length
  const change = prevTotal > 0 && prevLogged >= count / 4 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null
  return {
    total,
    avg: total / count,
    prevAvg: prevTotal / count,
    change,
    goalDays: goalDays(byDay, tracker, days),
    loggedDays: days.filter((d) => byDay[dayKey(d)]?.[tracker.id]).length,
    days: count,
  }
}

// The biggest single day ever logged for a tracker
export function personalBest(byDay, tracker) {
  let best = null
  for (const [key, sums] of Object.entries(byDay)) {
    const value = sums[tracker.id] || 0
    if (value > 0 && (!best || value > best.value)) {
      const [y, m, d] = key.split('-').map(Number)
      best = { value, date: new Date(y, m, d) }
    }
  }
  return best
}

// The tracker that missed its goal on the most days of the period
export function mostMissed(byDay, trackers, period, today = new Date()) {
  const days = daysEnding(PERIODS[period].days, today)
  const ranked = trackers
    .filter((t) => t.target_value > 0)
    .map((t) => ({ tracker: t, hit: goalDays(byDay, t, days), days: days.length }))
    .sort((a, b) => a.hit - b.hit)
  return ranked[0] || null
}

export function periodStats(byDay, trackers, period, today = new Date()) {
  const days = daysEnding(PERIODS[period].days, today)
  return {
    logged: days.filter((d) => byDay[dayKey(d)]).length,
    goals: trackers.reduce((n, t) => n + goalDays(byDay, t, days), 0),
    days: days.length,
  }
}

// One sentence in Libra's voice about the period. Computed here, no AI call.
export function periodInsight(byDay, trackers, period, today = new Date()) {
  const p = PERIODS[period]
  const stats = periodStats(byDay, trackers, period, today)
  if (trackers.length === 0) return 'Make a tracker and I’ll start reading the trends for you.'
  if (stats.logged === 0) return `Nothing logged in ${p.phrase} yet. One entry today and the charts come alive.`

  const moves = trackers
    .map((t) => ({ t, s: summary(byDay, t, period, today) }))
    .filter(({ s }) => s.change !== null && s.change !== 0)
    .sort((a, b) => Math.abs(b.s.change) - Math.abs(a.s.change))
  const missed = mostMissed(byDay, trackers, period, today)
  const parts = []
  if (moves[0]) {
    const { t, s } = moves[0]
    parts.push(`${t.name} is ${s.change > 0 ? 'up' : 'down'} ${Math.abs(s.change)}% on ${p.prev}.`)
  } else {
    parts.push(`You logged on ${stats.logged} of ${stats.days} days in ${p.phrase}.`)
  }
  if (missed && missed.hit < missed.days) {
    parts.push(missed.hit === 0
      ? `${missed.tracker.name} hasn’t hit its goal yet. Start there.`
      : `${missed.tracker.name} is the one to work on: goal hit ${missed.hit} of ${missed.days} days.`)
  } else if (missed) {
    parts.push('Every goal, every day. Nothing to fix.')
  }
  return parts.join(' ')
}
