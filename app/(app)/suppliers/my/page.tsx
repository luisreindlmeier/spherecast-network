import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import SuppliersTable from '@/components/sourcing/SuppliersTable'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { getSuppliers } from '@/lib/queries'

export default async function MySuppliersPage() {
  const scope = await resolveCompanyScopeFilter()
  const rows = await getSuppliers(scope)

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing · Suppliers"
        title="My Suppliers"
        description="All qualified suppliers — each count is distinct raw-material SKU links in the graph (no volumes or spend)."
        actions={<MapSidebarToggle />}
      />

      <SuppliersTable rows={rows} />
    </PageMapDrawer>
  )
}
