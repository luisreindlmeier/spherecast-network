import Sidebar from '@/components/layout/Sidebar'
import AppTopNav from '@/components/layout/AppTopNav'
import MapRightSidebar from '@/components/network-map/MapRightSidebar'
import { MapSidebarProvider } from '@/components/network-map/map-sidebar-context'
import { CompanyScopeProvider } from '@/lib/company-scope-context'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import {
  getCompanyPickerList,
  getGlobalSearchItems,
  getNavCounts,
  isAgnesAvailable,
} from '@/lib/agnes-queries'
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const scopeCompanyId = await resolveCompanyScopeFilter()

  const [pickerCompanies, agnesAvailable, counts, searchItems] =
    await Promise.all([
      getCompanyPickerList().catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[app-layout] company picker fallback: ${message}`)
        return []
      }),
      isAgnesAvailable(),
      getNavCounts(scopeCompanyId).catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[app-layout] nav counts fallback: ${message}`)
        return { finishedGoods: 0, rawMaterials: 0, suppliers: 0 }
      }),
      getGlobalSearchItems(scopeCompanyId).catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[app-layout] search items fallback: ${message}`)
        return []
      }),
    ])

  return (
    <CompanyScopeProvider
      key={String(scopeCompanyId ?? 'all')}
      companies={pickerCompanies}
      initialCompanyId={scopeCompanyId}
    >
      <MapSidebarProvider>
        <div className="app-shell">
          <Sidebar
            productsBadge={counts.finishedGoods}
            rawMaterialsBadge={counts.rawMaterials}
            suppliersBadge={counts.suppliers}
          />
          <main className="app-main">
            <div className="app-main-scroll app-main-chrome-bg">
              <AppTopNav searchItems={searchItems} />
              {!agnesAvailable ? (
                <div className="app-data-source-banner" role="status">
                  Agnes API offline. Showing fallback values until backend is
                  reachable.
                </div>
              ) : null}
              <div className="app-main-inner">{children}</div>
            </div>
            <MapRightSidebar />
          </main>
        </div>
      </MapSidebarProvider>
    </CompanyScopeProvider>
  )
}
