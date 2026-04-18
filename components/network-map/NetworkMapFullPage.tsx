'use client'

import dynamic from 'next/dynamic'
import { useCompanyScope } from '@/lib/company-scope-context'

const SupplierNetworkMap = dynamic(
  () => import('@/components/network-map/SupplierNetworkMap'),
  {
    ssr: false,
    loading: () => (
      <div className="network-map-fullpage-loading">Loading map…</div>
    ),
  }
)

/** Full-area map (same Deck.gl view as the sourcing task pane). */
export default function NetworkMapFullPage() {
  const { companyId } = useCompanyScope()
  return (
    <div className="network-map-fullpage">
      <SupplierNetworkMap key={companyId ?? 'all'} companyId={companyId} />
    </div>
  )
}
