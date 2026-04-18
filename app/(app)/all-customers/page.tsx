import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

export default function AllCustomersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Spherecast Only"
        title="All Customers"
        description="Every customer org on Spherecast. Admin-only visibility."
      />
      <DummyBlock title="7 customer orgs" hint="admin view" />
    </>
  )
}
