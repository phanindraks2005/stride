import { connection } from 'next/server'
import Dashboard from '@/app/(app)/dashboard/page'

// The read-only demo runs the real page on a sample account (see lib/demoDb.js).
// Rendered per request, like /dashboard (see its layout).
export default async function Demo() {
  await connection()
  return <Dashboard />
}
