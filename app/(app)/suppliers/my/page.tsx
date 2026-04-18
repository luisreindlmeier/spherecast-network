import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'

export default function MySuppliersPage() {
  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing · Suppliers"
        title="My Suppliers"
        titleActions={<MapSidebarToggle />}
        description="Suppliers you already work with — active contracts, qualifications and open RFQs."
      />
      <DummyBlock title="40 qualified suppliers" hint="12 active contracts" />
    </PageMapDrawer>
  )
}
