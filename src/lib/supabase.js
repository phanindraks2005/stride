import { createClient } from '@supabase/supabase-js'
import { demoClient } from './demoDb'
import { isDemoPath } from './useDemo'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const real = createClient(supabaseUrl, supabaseAnonKey)

// Pages are shared with the read-only /demo. Under /demo every call goes to an
// in-memory sample account instead (see demoDb.js): no network, no writes.
function inDemo() {
  return typeof window !== 'undefined' && isDemoPath(window.location.pathname)
}

export const supabase = new Proxy(real, {
  get(target, key) {
    const source = inDemo() ? demoClient() : target
    const value = source[key]
    return typeof value === 'function' ? value.bind(source) : value
  },
})
