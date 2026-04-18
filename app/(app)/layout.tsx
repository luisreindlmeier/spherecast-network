import Sidebar from '@/components/layout/Sidebar'
import { ViewerProvider } from '@/lib/viewer-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewerProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <div className="app-main-inner">{children}</div>
        </main>
      </div>
    </ViewerProvider>
  )
}
