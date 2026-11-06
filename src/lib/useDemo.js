'use client'
import { usePathname } from 'next/navigation'

export function isDemoPath(pathname) {
  return pathname === '/demo' || pathname.startsWith('/demo/')
}

// Pages are shared between the app and the read-only /demo. `href` maps an app
// path to its demo twin ("/fitness/2" → "/demo/fitness/2", "/dashboard" → "/demo").
export function useDemo() {
  const isDemo = isDemoPath(usePathname())
  function href(path) {
    if (!isDemo) return path
    if (path.startsWith('/dashboard')) return '/demo' + path.slice('/dashboard'.length)
    return '/demo' + path
  }
  return { isDemo, href }
}
