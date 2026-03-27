import BottomNav from './BottomNav'

export default function AppShell({ children }) {
  return (
    <div style={{ background: '#faf8f6', minHeight: '100svh' }}>
      <main>{children}</main>
      <BottomNav />
    </div>
  )
}
