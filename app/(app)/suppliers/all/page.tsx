import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'

export default function AllSuppliersPage() {
  return (
    <PageMapDrawer mapTitle="Supplier network · full directory">
      <PageHeader
        eyebrow="Sourcing · Suppliers"
        title="All Suppliers"
        description="Every supplier in the Spherecast network plus external matches Agnes surfaced for your materials."
      />
      <DummyBlock title="2,840 suppliers" hint="network + external" />
    </PageMapDrawer>
  )
}
