'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function Home() {
  const canvasRef = useRef(null)

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

      const light1 = new THREE.PointLight(0x7f5af0, 8, 40)
      light1.position.set(-6, 4, 6)
      scene.add(light1)
      const light2 = new THREE.PointLight(0xff6b4a, 8, 40)
      light2.position.set(6, -3, 4)
      scene.add(light2)
      const light3 = new THREE.PointLight(0x2ce8c9, 5, 40)
      light3.position.set(0, 6, -4)
      scene.add(light3)
      scene.add(new THREE.AmbientLight(0x222233, 1.5))

      const geos = [
        new THREE.TorusGeometry(1.4, 0.45, 32, 100),
        new THREE.IcosahedronGeometry(1.6, 0),
        new THREE.OctahedronGeometry(1.3, 0),
      ]
      const cols = [0x7f5af0, 0xff6b4a, 0x2ce8c9]
      const positions = [[4.5, 1.5, -2], [-5, -1.5, -3], [1, -3.5, -5]]

      geos.forEach((g, i) => {
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.25, metalness: 0.6 }))
        m.position.set(...positions[i])
        scene.add(m)
        shapes.push({ mesh: m, basePos: positions[i] })
      })

      function animate(t) {
        animationId = requestAnimationFrame(animate)
        shapes.forEach(({ mesh, basePos }, i) => {
          mesh.rotation.x += 0.002 + i * 0.0007
          mesh.rotation.y += 0.003
          mesh.position.y = basePos[1] + Math.sin(t * 0.0004 + i) * 0.4
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

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.85 }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 6%', maxWidth: '1400px', margin: '0 auto' }}>
          <div className="font-serif" style={{ fontSize: '24px' }}>
            Stride<span style={{ color: 'var(--coral)' }}>.</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link href="/login" style={{ color: 'var(--text-mid)', textDecoration: 'none', fontSize: '14px' }}>Log in</Link>
            <Link href="/signup" style={{
              background: 'linear-gradient(135deg, var(--violet), var(--coral))',
              padding: '11px 22px', borderRadius: '100px', color: '#fff', textDecoration: 'none',
              fontWeight: 500, fontSize: '14px',
            }}>
              Get started
            </Link>
          </div>
        </nav>

        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 6% 60px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 500, marginBottom: '22px' }}>
            Your daily momentum, engineered
          </p>
          <h1 className="font-serif" style={{ fontSize: 'clamp(42px, 6vw, 74px)', lineHeight: 1.05, marginBottom: '26px' }}>
            Don't just track it.<br />
            <em style={{
              fontStyle: 'italic',
              background: 'linear-gradient(120deg, var(--violet), var(--coral) 60%, var(--teal))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              Understand
            </em> it.
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--text-mid)', lineHeight: 1.65, maxWidth: '520px', margin: '0 auto 36px' }}>
            Stride reads your real progress and turns it into a copilot that actually acts — builds your meal plan, adjusts your workout, and shows its work.
          </p>
          <Link href="/signup" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, var(--violet), var(--coral))',
            color: '#fff', padding: '16px 32px', borderRadius: '100px',
            textDecoration: 'none', fontWeight: 500, fontSize: '15px',
            boxShadow: '0 8px 30px rgba(127,90,240,0.35)',
          }}>
            Start your streak →
          </Link>
        </section>
      </div>
    </div>
  )
}