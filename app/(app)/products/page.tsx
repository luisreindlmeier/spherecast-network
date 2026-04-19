import PageHeader from '@/components/layout/PageHeader'
import MapRightPanelSwitch from '@/components/network-map/MapRightPanelSwitch'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import ProductsTable from '@/components/sourcing/ProductsTable'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { getFinishedGoods } from '@/lib/agnes-queries'

export default async function ProductsPage() {
  const scope = await resolveCompanyScopeFilter()
  const rows = await getFinishedGoods(scope)

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Products"
        description="All finished goods in the Spherecast network — click a product to inspect its BOM and linked raw materials."
        actions={<MapRightPanelSwitch />}
      />

      <ProductsTable rows={rows} />
    </PageMapDrawer>
  )
}
