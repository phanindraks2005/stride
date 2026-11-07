import Link from 'next/link'
import Logo from '@/components/Logo'
import styles from './not-found.module.css'

export const metadata = { title: 'Page not found' }

// Any URL that matches no page, inside the app or out
export default function NotFound() {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.brand} aria-label="Stride home"><Logo /></Link>
      <main className={styles.body}>
        <p className={`num ${styles.code}`} aria-hidden="true">404</p>
        <h1 className={styles.title}>This page isn’t here</h1>
        <p className={styles.sub}>The link may be old or mistyped. Your streak is fine.</p>
        <div className={styles.actions}>
          <Link href="/dashboard" className="btn btn-primary">Go to Today</Link>
          <Link href="/" className="btn btn-secondary">Stride home</Link>
        </div>
      </main>
    </div>
  )
}
