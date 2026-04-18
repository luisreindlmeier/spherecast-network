import Sidebar from '@/components/layout/Sidebar'

export default function AgnesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{children}</main>
    </div>
  )
}
