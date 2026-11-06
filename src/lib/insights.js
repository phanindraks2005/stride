import { dayKey, lastDays } from './streakCore'

// Goals hit per tracker over the last 7 days, from a byDay map
export function weekStats(trackers, byDay, today = new Date()) {
  const days = lastDays(7, today).map((date) => {
    const sums = byDay[dayKey(date)] || {}
    const hit = trackers.filter((t) => t.target_value > 0 && (sums[t.id] || 0) >= t.target_value)
    return { date, hit: hit.map((t) => t.id), logged: Object.keys(sums).length > 0 }
  })
  const perTracker = trackers.map((t) => ({
    tracker: t,
    days: days.filter((d) => d.hit.includes(t.id)).length,
  }))
  return { days, perTracker }
}

// One plain sentence about the week, in Libra's voice. Worked out locally, no AI call.
export function weekInsight({ days, perTracker }) {
  const logged = days.filter((d) => d.logged).length
  if (logged === 0) return 'Log anything today and I’ll start spotting patterns in your week.'
  const ranked = [...perTracker].sort((a, b) => b.days - a.days)
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  if (best.days === 0) return `You logged on ${logged} of the last 7 days. Next step: close one goal fully.`
  if (best.days === 7) return `${best.tracker.name} hit its target every day this week. ${worst.days < 7 ? `${worst.tracker.name} is the one to work on (${worst.days} of 7).` : 'Everything did. Rare week.'}`
  return `${best.tracker.name} was your most consistent, on target ${best.days} of 7 days. ${worst.days === 0 ? `${worst.tracker.name} didn’t hit its target once.` : `${worst.tracker.name} got there on ${worst.days}.`}`
}
