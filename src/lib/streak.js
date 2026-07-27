import { supabase } from './supabase'

export async function calculateStreak(userId) {
  const { data: logs } = await supabase
    .from('logs')
    .select('logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })

  if (!logs || logs.length === 0) return 0

  // Get unique dates (as date strings, ignoring time) that have at least one log
  const loggedDates = new Set(
    logs.map((log) => new Date(log.logged_at).toDateString())
  )

  let streak = 0
  let checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)

  // If nothing logged today yet, start checking from yesterday instead —
  // so the streak doesn't reset to 0 just because today isn't over yet
  if (!loggedDates.has(checkDate.toDateString())) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (loggedDates.has(checkDate.toDateString())) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}