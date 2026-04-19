import PageHeader from '@/components/layout/PageHeader'
import MapRightPanelSwitch from '@/components/network-map/MapRightPanelSwitch'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import RawMaterialsTable from '@/components/sourcing/RawMaterialsTable'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { getRawMaterials } from '@/lib/agnes-queries'

export default async function RawMaterialsPage() {
  const scope = await resolveCompanyScopeFilter()
  const rows = await getRawMaterials(scope)

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Raw Materials"
        description="All ingredients in the Spherecast network — supplier coverage, BOM usage, and consolidation potential."
        actions={<MapRightPanelSwitch />}
      />

      <RawMaterialsTable rows={rows} />
    </PageMapDrawer>
  )
}
