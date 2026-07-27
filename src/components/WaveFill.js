'use client'

export default function WaveFill({ percent, color = 'var(--violet)' }) {
  const clampedPercent = Math.min(100, Math.max(0, percent))

  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '18px', overflow: 'hidden', zIndex: 0,
    }}>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${clampedPercent}%`,
          transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* solid fill body */}
        <div style={{
          position: 'absolute', top: '10px', left: 0, right: 0, bottom: 0,
          background: color, opacity: 0.18,
        }} />

        {/* wave riding on top of the fill surface */}
        <svg
          style={{
            position: 'absolute',
            top: '-10px',
            left: '-50%',
            width: '200%',
            height: '24px',
            animation: 'waveMove 3.5s linear infinite',
          }}
          viewBox="0 0 400 24"
          preserveAspectRatio="none"
        >
          <path
            d="M0,12 C50,24 100,0 150,12 C200,24 250,0 300,12 C350,24 400,0 400,12 L400,24 L0,24 Z"
            fill={color}
            opacity="0.35"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes waveMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
      `}</style>
    </div>
  )
}