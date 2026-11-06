// A liquid level in a tracker's hue. The level eases to `percent` (so a log visibly
// rises), and two layered sine waves drift across the surface at their own speed.
export default function WaveFill({ percent, color = 'var(--t-water)', speed = 6, rise = true, className, style }) {
  const level = Math.min(100, Math.max(0, percent || 0))

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', ...style }} aria-hidden="true">
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%',
          transform: `translateY(${100 - level}%)`,
          transition: 'transform 1.1s var(--ease)',
          animation: rise ? 'wave-rise 1.4s var(--ease) both' : undefined,
          willChange: 'transform',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, color-mix(in srgb, ${color} 62%, #0d0e18), color-mix(in srgb, ${color} 34%, #0d0e18))` }} />
        {level > 0 && level < 100 && (
          <>
            <svg viewBox="0 0 400 16" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 'calc(100% - 1px)', left: 0, width: '200%', height: 14, fill: `color-mix(in srgb, ${color} 62%, #0d0e18)`, animation: `drift ${speed}s linear infinite` }}>
              <path d="M0 8 Q25 1 50 8 T100 8 T150 8 T200 8 T250 8 T300 8 T350 8 T400 8 V16 H0Z" />
            </svg>
            <svg viewBox="0 0 400 16" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 'calc(100% - 2px)', left: 0, width: '200%', height: 10, fill: `color-mix(in srgb, ${color} 40%, transparent)`, animation: `drift ${speed * 1.6}s linear infinite reverse` }}>
              <path d="M0 8 Q25 2 50 8 T100 8 T150 8 T200 8 T250 8 T300 8 T350 8 T400 8 V16 H0Z" />
            </svg>
          </>
        )}
      </div>
    </div>
  )
}
