'use client'

import dynamic from 'next/dynamic'

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
  return (
    <div className="network-map-fullpage">
      <SupplierNetworkMap />
    </div>
  )
}
