// One formatter each: toLocaleString with options builds a new one on every call
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

export function fmt(n) {
  return number.format(Number(n || 0))
}

export function percentOf(total, target) {
  if (!target || target <= 0) return 0
  return Math.round((total / target) * 100)
}

export function timeOf(iso) {
  return time.format(new Date(iso))
}
