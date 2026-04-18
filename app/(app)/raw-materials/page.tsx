import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import RawMaterialsTable from '@/components/sourcing/RawMaterialsTable'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { getRawMaterials } from '@/lib/queries'

export default async function RawMaterialsPage() {
  const scope = await resolveCompanyScopeFilter()
  const rows = await getRawMaterials(scope)

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Raw Materials"
        description="All ingredients in the Spherecast network — supplier coverage, BOM usage, and consolidation potential."
        actions={<MapSidebarToggle />}
      />

      <RawMaterialsTable rows={rows} />
    </PageMapDrawer>
  )
}
