import PageHeader from '@/components/layout/PageHeader'
import NetworkMapFullPage from '@/components/network-map/NetworkMapFullPage'

export default function NetworkMapPage() {
  return (
    <div className="page-network-map">
      <PageHeader
        eyebrow="Network Intelligence"
        title="Network Map"
        description="Supplier and customer locations with connection arcs — same interactive map as in sourcing, full width below."
      />
      <NetworkMapFullPage />
    </div>
  )
}
