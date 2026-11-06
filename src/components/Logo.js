// The Stride mark: a volt tile with a rising stride line, and the wordmark
export function Mark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" rx="7" fill="var(--volt)" />
      <path d="M6.5 17.5l4-8 4 6 4.5-7.5" stroke="var(--volt-ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Logo({ size = 26, fontSize = 22 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize, letterSpacing: '-0.03em', lineHeight: 1 }} translate="no">
      <Mark size={size} />
      stride
    </span>
  )
}
