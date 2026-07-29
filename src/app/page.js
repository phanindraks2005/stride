'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function Home() {
  const canvasRef = useRef(null)
  const [waterPct, setWaterPct] = useState(0)
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])

  useEffect(() => {
    let renderer, scene, camera, animationId
    const shapes = []

    async function init() {
      const THREE = await import('three')
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true })
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
      camera.position.z = 13

      scene.add(new THREE.PointLight(0x7f5af0, 6, 40).translateX(-6).translateY(4).translateZ(6))
      scene.add(new THREE.PointLight(0xff6b4a, 6, 40).translateX(6).translateY(-3).translateZ(4))
      scene.add(new THREE.AmbientLight(0x1a1a24, 1.2))

      const geos = [new THREE.TorusGeometry(1.1, 0.32, 32, 100), new THREE.IcosahedronGeometry(1.2, 0)]
      const cols = [0x7f5af0, 0xff6b4a]
      const positions = [[6, 3, -4], [-6.5, -2.5, -5]]

      geos.forEach((g, i) => {
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.3, metalness: 0.5 }))
        m.position.set(...positions[i])
        scene.add(m)
        shapes.push({ mesh: m, basePos: positions[i] })
      })

      function animate(t) {
        animationId = requestAnimationFrame(animate)
        shapes.forEach(({ mesh, basePos }, i) => {
          mesh.rotation.x += 0.0015
          mesh.rotation.y += 0.002
          mesh.position.y = basePos[1] + Math.sin(t * 0.0003 + i) * 0.35
        })
        renderer.render(scene, camera)
      }
      animationId = requestAnimationFrame(animate)
    }
    init()

    function handleResize() {
      if (!camera || !renderer) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationId) cancelAnimationFrame(animationId)
      if (renderer) renderer.dispose()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setWaterPct((p) => (p >= 78 ? 78 : p + 2))
    }, 25)
    return () => clearInterval(interval)
  }, [])

  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <div style={{ position: 'relative', background: 'var(--bg)' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.7 }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '26px 6%', maxWidth: '1300px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 96 96">
              <defs>
                <linearGradient id="navMark" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7f5af0" /><stop offset="100%" stopColor="#ff6b4a" />
                </linearGradient>
              </defs>
              <circle cx="48" cy="48" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle cx="48" cy="48" r="34" fill="none" stroke="url(#navMark)" strokeWidth="6" strokeLinecap="round" strokeDasharray="150 214" transform="rotate(-90 48 48)" />
              <path d="M32 48 L40 48 L44 38 L52 58 L56 48 L64 48" fill="none" stroke="#2ce8c9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-serif" style={{ fontSize: '19px' }}>Stride<span style={{ color: 'var(--coral)' }}>.</span></span>
          </div>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            <Link href="/login" style={{ color: 'var(--text-mid)', textDecoration: 'none', fontSize: '14px' }}>Log in</Link>
            <Link href="/signup" style={{ background: 'linear-gradient(135deg, var(--violet), var(--coral))', padding: '10px 20px', borderRadius: '100px', color: '#fff', textDecoration: 'none', fontWeight: 500, fontSize: '14px' }}>
              Get started
            </Link>
          </div>
        </nav>

        {/* HERO — split, product-first */}
        <motion.section style={{ opacity: heroOpacity }}>
          <div style={{
            maxWidth: '1300px', margin: '0 auto', padding: '60px 6% 40px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', alignItems: 'center',
          }} className="hero-grid">
            <div>
              <motion.p initial="hidden" animate="show" variants={fadeUp}
                style={{ fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 500, marginBottom: '20px' }}>
                For people who quit trackers, not habits
              </motion.p>
              <motion.h1 initial="hidden" animate="show" variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...fadeUp.show.transition, delay: 0.08 } } }}
                className="font-serif" style={{ fontSize: 'clamp(38px, 4.4vw, 58px)', lineHeight: 1.08, marginBottom: '22px' }}>
                Most apps make you<br />
                <span style={{ textDecoration: 'line-through', color: 'var(--text-low)', fontWeight: 400 }}>log data.</span>
                <br />
                Stride <em style={{ fontStyle: 'italic', background: 'linear-gradient(120deg, var(--violet), var(--coral) 60%, var(--teal))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  acts on it.
                </em>
              </motion.h1>
              <motion.p initial="hidden" animate="show" variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...fadeUp.show.transition, delay: 0.16 } } }}
                style={{ fontSize: '16px', color: 'var(--text-mid)', lineHeight: 1.65, maxWidth: '440px', marginBottom: '32px' }}>
                Libra reads your real logs, workouts, and notes — then actually does something: builds a meal plan around what you're short on, adjusts today's workout, logs it for you.
              </motion.p>
              <motion.div initial="hidden" animate="show" variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...fadeUp.show.transition, delay: 0.24 } } }}
                style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <Link href="/signup" style={{
                  background: 'linear-gradient(135deg, var(--violet), var(--coral))', color: '#fff',
                  padding: '15px 28px', borderRadius: '100px', textDecoration: 'none', fontWeight: 500, fontSize: '14.5px',
                  boxShadow: '0 8px 30px rgba(127,90,240,0.3)',
                }}>
                  Start free →
                </Link>
                <span style={{ fontSize: '13px', color: 'var(--text-low)' }}>No card. 30 seconds.</span>
              </motion.div>
            </div>

            {/* Live product mockup, not abstract art */}
            <motion.div
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
              style={{
                background: '#111119', border: '1px solid var(--card-border)', borderRadius: '20px',
                padding: '18px', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ff6b4a' }} />
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ffd166' }} />
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#2ce8c9' }} />
              </div>

              <div style={{
                position: 'relative', borderRadius: '14px', overflow: 'hidden',
                border: '1px solid var(--card-border)', padding: '18px', marginBottom: '12px',
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: `${waterPct}%`,
                  background: '#4a9eff', opacity: 0.18, transition: 'height 0.3s',
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-hi)' }}>💧 Water</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-low)' }}>{waterPct}%</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${waterPct}%` }} /></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  flex: 1, background: 'var(--card)', border: '1px solid var(--card-border)',
                  borderRadius: '14px', padding: '14px 16px',
                }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-low)', marginBottom: '8px' }}>LIBRA</p>
                  <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-hi)' }}>
                    You're 22g short on protein — want a quick high-protein dinner?
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '14px',
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px' }}>🔥 12 day streak</span>
                <span style={{ fontSize: '11px', color: 'var(--teal)' }}>Personal best</span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* MARQUEE STRIP */}
        <div style={{ overflow: 'hidden', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)', padding: '18px 0', margin: '60px 0' }}>
          <div className="marquee-track" style={{ display: 'flex', gap: '48px', width: 'max-content' }}>
            {[...Array(2)].map((_, rep) => (
              <div key={rep} style={{ display: 'flex', gap: '48px' }}>
                {['Trackers that bend to you', 'A copilot that acts', 'Momentum you can see', 'Built for real days, not perfect ones'].map((t) => (
                  <span key={t} style={{ fontFamily: 'Fraunces, serif', fontSize: '18px', color: 'var(--text-low)', whiteSpace: 'nowrap' }}>
                    {t} <span style={{ color: 'var(--coral)' }}>·</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FEATURE BENTO GRID */}
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 6% 100px' }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={fadeUp} style={{ maxWidth: '520px', marginBottom: '48px' }}>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '14px' }}>How it actually works</p>
            <h2 className="font-serif" style={{ fontSize: '32px', lineHeight: 1.2 }}>Not a dashboard. A daily loop.</h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '18px' }} className="bento-grid">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}
              className="glass-card bento-large" style={{ gridColumn: 'span 4', padding: '32px' }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '20px', marginBottom: '10px' }}>Libra reads everything, not just numbers</h3>
              <p style={{ fontSize: '14.5px', color: 'var(--text-mid)', lineHeight: 1.6, maxWidth: '420px' }}>
                Your trackers, your last workout, your notes from Tuesday — all of it, every time you ask. Not a chatbot with amnesia between messages.
              </p>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}
              className="glass-card bento-small" style={{ gridColumn: 'span 2', padding: '28px' }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '17px', marginBottom: '8px' }}>Trackers, your rules</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-mid)', lineHeight: 1.55 }}>Water, protein, meditation, study — track anything, not a fixed list.</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}
              className="glass-card bento-small" style={{ gridColumn: 'span 2', padding: '28px' }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '17px', marginBottom: '8px' }}>Fitness, by muscle</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-mid)', lineHeight: 1.55 }}>Pick today's focus, log sets and reps, get real analysis on balance.</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}
              className="glass-card bento-small" style={{ gridColumn: 'span 4', padding: '28px' }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '17px', marginBottom: '8px' }}>Momentum you can actually see</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-mid)', lineHeight: 1.55 }}>Week, month, or year — compare periods, watch streaks build, no spreadsheet required.</p>
            </motion.div>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 6% 120px', textAlign: 'center' }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }} variants={fadeUp}>
            <h2 className="font-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 40px)', marginBottom: '20px' }}>
              Your streak starts <span style={{ background: 'linear-gradient(120deg, var(--violet), var(--coral))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>today</span>, not Monday.
            </h2>
            <Link href="/signup" style={{
              display: 'inline-block', background: 'linear-gradient(135deg, var(--violet), var(--coral))',
              color: '#fff', padding: '16px 34px', borderRadius: '100px', textDecoration: 'none',
              fontWeight: 500, fontSize: '15px', boxShadow: '0 8px 30px rgba(127,90,240,0.35)',
            }}>
              Create your account
            </Link>
          </motion.div>
        </section>

        <footer style={{ textAlign: 'center', padding: '30px 6% 50px', color: 'var(--text-low)', fontSize: '12.5px' }}>
          Stride — built by someone who got tired of generic trackers.
        </footer>
      </div>

      <style jsx>{`
        .marquee-track { animation: marquee 22s linear infinite; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-large, .bento-small { grid-column: span 2 !important; }
        }
      `}</style>
    </div>
  )
}