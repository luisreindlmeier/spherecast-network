import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'

export default function RawMaterialsPage() {
  return (
    <PageMapDrawer mapTitle="Supplier network · materials context">
      <PageHeader
        eyebrow="Sourcing"
        title="Raw Materials"
        titleActions={<MapSidebarToggle />}
        description="The 149 ingredients you buy, grouped by category — with substitutes, specs and active suppliers."
      />
      <DummyBlock title="149 materials" hint="8 categories" />
    </PageMapDrawer>
  )
}
