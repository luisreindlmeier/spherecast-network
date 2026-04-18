import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="My Intelligence"
        title="Opportunities"
        description="Ranked consolidation and sourcing opportunities surfaced by Agnes across your BOMs and supplier network."
      />
      <DummyBlock title="12 open opportunities" hint="ranked by confidence" />
    </>
  )
}
