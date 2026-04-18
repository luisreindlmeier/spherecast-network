import Sidebar from '@/components/layout/Sidebar'
import MapRightSidebar from '@/components/network-map/MapRightSidebar'
import { MapSidebarProvider } from '@/components/network-map/map-sidebar-context'
import { ViewerProvider } from '@/lib/viewer-context'
import { getNavCounts } from '@/lib/queries'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const counts = await getNavCounts()

  return (
    <ViewerProvider>
      <MapSidebarProvider>
        <div className="app-shell">
          <Sidebar
            productsBadge={counts.finishedGoods}
            rawMaterialsBadge={counts.rawMaterials}
            suppliersBadge={counts.suppliers}
          />
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
