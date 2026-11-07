import { connection } from 'next/server'
import Notes from '@/app/(app)/notes/page'

// The read-only demo runs the real page on a sample account (see lib/demoDb.js).
// Rendered per request, like /notes (see its layout).
export default async function DemoNotes() {
  await connection()
  return <Notes />
}
