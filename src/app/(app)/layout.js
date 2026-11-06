import Shell from '@/components/Shell'

// The signed-in frame (sidebar, tab bar) for every app page and the demo.
// Pages outside this group (landing, auth, onboarding) never load it.
export default function AppLayout({ children }) {
  return <Shell>{children}</Shell>
}
