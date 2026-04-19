'use client'

import { useCompanyScope } from '@/lib/company-scope-context'
import { createSupplierNetworkMapDynamic } from '@/components/network-map/SupplierNetworkMapDynamic'

const SupplierNetworkMap = createSupplierNetworkMapDynamic(
  'network-map-fullpage-loading'
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
