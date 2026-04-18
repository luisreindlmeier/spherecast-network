import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

export default function ConsolidationPoolPage() {
  return (
    <>
      <PageHeader
        eyebrow="Spherecast Only"
        title="Consolidation Pool"
        description="Cross-customer demand pooled by material. Identify consolidation leverage across the network."
      />
      <DummyBlock title="Pooled volume" hint="anonymised" />
    </>
  )
}
