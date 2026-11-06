// Supabase auth errors in plain words. Never show the raw message.
export function authMessage(error) {
  if (!error) return ''
  const msg = (error.message || '').toLowerCase()
  if (!navigator.onLine || msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Couldn’t reach Stride. Check your connection and try again.'
  }
  if (msg.includes('invalid login credentials')) return 'That email and password don’t match. Check both and try again.'
  if (msg.includes('email not confirmed')) return 'Confirm your email first: open the link we sent you, then log in.'
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'There’s already an account with this email. Log in instead.'
  if (msg.includes('password') && (msg.includes('at least') || msg.includes('short') || msg.includes('weak'))) return 'Use a longer password: at least 8 characters.'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many tries in a row. Wait a minute and try again.'
  if (msg.includes('invalid') && msg.includes('email')) return 'That email address doesn’t look right.'
  return 'Something went wrong on our side. Try again in a moment.'
}
