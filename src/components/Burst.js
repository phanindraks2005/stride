// Lime dots flying out from a point. Remount (change `key`) to replay.
export default function Burst({ x = '50%', y = '50%', count = 8 }) {
  const step = 360 / count
  return (
    <span className="burst" aria-hidden="true" style={{ '--bx': x, '--by': y }}>
      {Array.from({ length: count }, (_, i) => <i key={i} style={{ '--a': `${i * step + step / 2}deg`, '--d': `${i % 2 ? 46 : 70}px` }} />)}
    </span>
  )
}
