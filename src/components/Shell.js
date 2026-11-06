'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, LineChart, Dumbbell, NotebookPen, CalendarDays, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { storeUnits } from '@/lib/units'
import Logo from '@/components/Logo'
import LibraGlyph from '@/components/LibraGlyph'

const LibraIcon = ({ size }) => <LibraGlyph size={size + 2} inherit />
import styles from './AppShell.module.css'

const NAV = [
  { href: '/dashboard', label: 'Today', icon: LayoutGrid },
  { href: '/copilot', label: 'Libra', icon: LibraIcon },
  { href: '/progress', label: 'Progress', icon: LineChart },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell },
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  // Desktop sidebar only; phones reach it from the top bar
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, tab: false },
]

// The read-only demo runs the same pages under /demo (see lib/demoDb.js)
const DEMO_NAV = NAV.map((item) => ({
  ...item,
  href: item.href === '/dashboard' ? '/demo' : `/demo${item.href}`,
}))

function useProfile() {
  const [profile, setProfile] = useState({ name: '', initial: '', avatarUrl: '' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      // Keep this browser's unit choice in step with the profile
      if (data?.units) storeUnits(data.units)
      setProfile({
        name: data?.name || user.email.split('@')[0],
        initial: (data?.name?.[0] || user.email[0]).toUpperCase(),
        avatarUrl: data?.avatar_seed ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(data.avatar_seed)}` : '',
      })
    }
    load()
    window.addEventListener('profileUpdated', load)
    return () => window.removeEventListener('profileUpdated', load)
  }, [])

  return profile
}

function Avatar({ profile, size = 32 }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size }}>
      {profile.avatarUrl
        ? <img src={profile.avatarUrl} alt="" width={size} height={size} />
        : profile.initial}
    </span>
  )
}

// Which page's accent light to show: /demo/fitness/2 → 'fitness', /dashboard → 'today'
function pageKey(pathname) {
  const part = pathname.replace(/^\/demo/, '').split('/')[1] || 'dashboard'
  return part === 'dashboard' ? 'today' : part
}

// The signed-in frame: sidebar on desktop, top bar and tab bar on phones.
// Rendered by the (app) route group's layout, so only app pages load it.
export default function Shell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const profile = useProfile()

  const isDemo = pathname === '/demo' || pathname.startsWith('/demo/')
  const nav = isDemo ? DEMO_NAV : NAV
  const home = isDemo ? '/demo' : '/dashboard'
  const isActive = (href) => pathname === href || (href !== '/demo' && pathname.startsWith(href + '/'))

  async function handleLogout() {
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login')
  }

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>Skip to content</a>

      <aside className={styles.sidebar} aria-label="Main">
        <Link href={isDemo ? '/' : '/dashboard'} className={styles.brand} aria-label={isDemo ? 'Stride home' : 'Stride, today'}>
          <Logo />
        </Link>
        <nav className={styles.nav}>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              prefetch={false}
              key={href}
              href={href}
              className={styles.navItem}
              data-active={isActive(href) || undefined}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        {isDemo ? (
          <div className={styles.demoWrap}>
            <div className={styles.demoFoot}>
              <p>A sample account to look around. Nothing here can be changed.</p>
              <Link href="/signup" className="btn btn-primary btn-sm">Create your account</Link>
            </div>
            <Link href="/demo/profile" className={styles.profile} data-active={isActive('/demo/profile') || undefined}>
              <Avatar profile={profile} />
              <span className={styles.profileName}>{profile.name || 'Profile'}</span>
            </Link>
          </div>
        ) : (
        <div className={styles.sideFoot}>
          <Link href="/profile" className={styles.profile} data-active={isActive('/profile') || undefined}>
            <Avatar profile={profile} />
            <span className={styles.profileName}>{profile.name || 'Profile'}</span>
          </Link>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Log out">
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
        )}
      </aside>

      <header className={styles.topbar}>
        <Link href={isDemo ? '/' : home} aria-label={isDemo ? 'Stride home' : 'Stride, today'}><Logo size={24} fontSize={20} /></Link>
        {isDemo ? (
          <div className={styles.topActions}>
            <Link href="/demo/calendar" className="icon-btn" aria-label="Calendar" data-active={isActive('/demo/calendar') || undefined}>
              <CalendarDays size={18} aria-hidden="true" />
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            <Link href="/demo/profile" aria-label="Sample profile"><Avatar profile={profile} size={32} /></Link>
          </div>
        ) : (
          <div className={styles.topActions}>
            <Link href="/calendar" className="icon-btn" aria-label="Calendar" data-active={isActive('/calendar') || undefined}>
              <CalendarDays size={18} aria-hidden="true" />
            </Link>
            <Link href="/profile" aria-label="Profile"><Avatar profile={profile} size={32} /></Link>
          </div>
        )}
      </header>

      <main id="main" className={styles.main} data-page={pageKey(pathname)}>
        <div key={pathname} className={styles.page}>{children}</div>
      </main>

      <nav className={styles.tabbar} aria-label="Main" hidden={nav.length < 2}>
        {nav.filter((item) => item.tab !== false).map(({ href, label, icon: Icon }) => (
          <Link
            prefetch={false}
            key={href}
            href={href}
            className={styles.tab}
            data-active={isActive(href) || undefined}
            aria-current={isActive(href) ? 'page' : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
