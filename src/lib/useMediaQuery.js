'use client'
import { useCallback, useSyncExternalStore } from 'react'

// True while the media query matches; `serverValue` during the server render
export function useMediaQuery(query, serverValue = false) {
  const subscribe = useCallback((callback) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', callback)
    return () => mq.removeEventListener('change', callback)
  }, [query])
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => serverValue)
}
