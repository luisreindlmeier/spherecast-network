import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

export default function EvidenceTrailsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sourcing"
        title="Evidence Trails"
        description="Full audit log of every decision Agnes made — what it saw, what it reasoned, what you accepted or rejected."
      />
      <DummyBlock title="Decision log" hint="last 30 days" />
    </>
  )
}
