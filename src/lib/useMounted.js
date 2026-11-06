import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// False during the server render and hydration, true once on the client.
// For things that depend on the visitor's clock or locale.
export function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
