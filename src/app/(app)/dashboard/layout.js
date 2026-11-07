import { connection } from 'next/server'

// Rendered per request: a prerendered page opened with ?date= can't move to
// another day (the router keeps resolving back to the first URL)
export default async function DashboardLayout({ children }) {
  await connection()
  return children
}
