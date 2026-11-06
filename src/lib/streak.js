import { supabase } from './supabase'
import { dayKey, streakFromDays } from './streakCore'

export { dayKey, lastDays, streakFromDays } from './streakCore'

// Streak stats plus each day's total per tracker ({ dayKey: { trackerId: sum } }),
// which the heatmap and the weekly chart are drawn from.
// Supabase returns at most 1,000 rows per request, so read the logs in pages.
const PAGE = 1000

export async function getStreakStats(userId) {
  const logs = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('logs')
      .select('logged_at, tracker_id, value')
      .eq('user_id', userId)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    logs.push(...data)
    if (data.length < PAGE) break
  }
  const byDay = {}
  for (const log of logs) {
    const key = dayKey(log.logged_at)
    byDay[key] ??= {}
    byDay[key][log.tracker_id] = (byDay[key][log.tracker_id] || 0) + log.value
  }
  return { ...streakFromDays(new Set(Object.keys(byDay))), byDay }
}

export async function calculateStreak(userId) {
  const { current } = await getStreakStats(userId)
  return current
}

