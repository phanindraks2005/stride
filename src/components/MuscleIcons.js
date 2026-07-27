export function ChestIcon({ size = 22, color = 'var(--coral)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4c-2 0-3.5 1.2-4.5 2.8C6.5 8 5 8.5 4 10c-1.2 1.8-1 4 .5 5 1.2.8 2.5.3 3-.5.8 1.5 2.5 2.5 4.5 2.5s3.7-1 4.5-2.5c.5.8 1.8 1.3 3 .5 1.5-1 1.7-3.2.5-5-1-1.5-2.5-2-3.5-3.2C15.5 5.2 14 4 12 4z" />
      <path d="M12 6.5v11" strokeDasharray="1 2.5" />
    </svg>
  )
}

export function BackIcon({ size = 22, color = 'var(--coral)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="M12 6c-3 1-5 3-6 6-.8 2.5-.5 5 .5 6.5" />
      <path d="M12 6c3 1 5 3 6 6 .8 2.5.5 5-.5 6.5" />
      <path d="M12 10c-2 .5-3.5 1.8-4.5 3.5" />
      <path d="M12 10c2 .5 3.5 1.8 4.5 3.5" />
    </svg>
  )
}

export function BicepsIcon({ size = 22, color = 'var(--coral)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 20c0-4 0-9 3-12 2-2 5-2 6.5-.5s1 4-1 5.5c2-.5 4 0 4.5 2 .7 2.8-1.5 5-4 5H9" />
      <path d="M6 20h3" />
    </svg>
  )
}

export function TricepsIcon({ size = 22, color = 'var(--coral)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4c1.5 1 2 3 2 5.5v9" />
      <path d="M16 4c-1.5 1-2 3-2 5.5v9" />
      <path d="M8 9.5c2.5 1.5 5.5 1.5 8 0" />
      <path d="M8 18.5h8" />
    </svg>
  )
}

export function LegsIcon({ size = 22, color = 'var(--coral)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3c-.5 3-.5 6 0 8-1 3-1.5 6-2.5 10" />
      <path d="M15 3c.5 3 .5 6 0 8 1 3 1.5 6 2.5 10" />
      <path d="M9 3h6" />
      <path d="M8.5 11h7" />
    </svg>
  )
}