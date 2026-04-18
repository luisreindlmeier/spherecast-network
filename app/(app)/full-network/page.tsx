import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

export default function FullNetworkPage() {
  return (
    <>
      <PageHeader
        eyebrow="Spherecast Only"
        title="Full Network View"
        description="The complete Spherecast graph — customers, materials and suppliers in one canvas."
      />
      <DummyBlock title="Network graph" hint="all entities" />
    </>
  )
}
