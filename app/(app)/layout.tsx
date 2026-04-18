import Sidebar from '@/components/layout/Sidebar'
import MapRightSidebar from '@/components/network-map/MapRightSidebar'
import { MapSidebarProvider } from '@/components/network-map/map-sidebar-context'
import { ViewerProvider } from '@/lib/viewer-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewerProvider>
      <MapSidebarProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="app-main">
            <div className="app-main-scroll app-main-chrome-bg">
              <div className="app-main-inner">{children}</div>
            </div>
            <MapRightSidebar />
          </main>
        </div>
      </MapSidebarProvider>
    </ViewerProvider>
  )
}
