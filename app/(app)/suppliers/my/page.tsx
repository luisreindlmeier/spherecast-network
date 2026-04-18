import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

export default function MySuppliersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sourcing · Suppliers"
        title="My Suppliers"
        description="Suppliers you already work with — active contracts, qualifications and open RFQs."
      />
      <DummyBlock title="40 qualified suppliers" hint="12 active contracts" />
    </>
  )
}
