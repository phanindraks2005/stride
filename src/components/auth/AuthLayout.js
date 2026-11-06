import Link from 'next/link'
import Logo from '@/components/Logo'
import styles from './auth.module.css'

// Form on the left, a live piece of the product on the right (hidden on phones)
export default function AuthLayout({ children, visual, foot }) {
  return (
    <div className={styles.page}>
      <div className={styles.formSide}>
        <Link href="/" className={styles.brand} aria-label="Stride home"><Logo /></Link>
        <main className={styles.formWrap}>{children}</main>
        {foot && <p className={styles.foot}>{foot}</p>}
      </div>
      <aside className={styles.visualSide} aria-hidden="true">{visual}</aside>
    </div>
  )
}
