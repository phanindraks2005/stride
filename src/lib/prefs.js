// Profile settings added after launch (units, weekly sessions) live in columns
// that older databases may not have yet. Until the columns exist, the app keeps
// them in this browser instead, so the settings still work.

const SESSIONS_KEY = 'stride-weekly-sessions'

export function isMissingColumn(error) {
  return error?.code === 'PGRST204'
}

export function localWeeklySessions() {
  try {
    const n = parseInt(localStorage.getItem(SESSIONS_KEY), 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function storeWeeklySessions(n) {
  try {
    if (n === null || n === undefined) localStorage.removeItem(SESSIONS_KEY)
    else localStorage.setItem(SESSIONS_KEY, String(n))
  } catch { /* private mode */ }
}

// The weekly sessions goal from a profile row, falling back to this browser
export function weeklySessionsOf(profile) {
  if (profile && 'weekly_sessions' in profile) return profile.weekly_sessions
  return localWeeklySessions()
}
