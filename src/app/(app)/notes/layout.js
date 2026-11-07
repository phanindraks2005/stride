import { connection } from 'next/server'

// Rendered per request, like /dashboard: the page follows ?id=, which a
// prerendered page loaded with one can't change by navigating
export default async function NotesLayout({ children }) {
  await connection()
  return children
}
