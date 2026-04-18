import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'

export default function RawMaterialsPage() {
  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Raw Materials"
        description="The 149 ingredients you buy, grouped by category — with substitutes, specs and active suppliers."
        actions={<MapSidebarToggle />}
      />
      <DummyBlock title="149 materials" hint="8 categories" />
    </PageMapDrawer>
  )
}
