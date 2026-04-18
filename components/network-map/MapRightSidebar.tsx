'use client'

import dynamic from 'next/dynamic'
import { useId } from 'react'
import { useMapSidebar } from '@/components/network-map/map-sidebar-context'

const SupplierNetworkMap = dynamic(
  () => import('@/components/network-map/SupplierNetworkMap'),
  {
    ssr: false,
    loading: () => (
      <div className="map-right-sidebar-map-loading">Loading map…</div>
    ),
  }
)

/** Full-viewport-height right rail (mirrors left app sidebar pattern). */
export default function MapRightSidebar() {
  const { active, isOpen, mapTitle } = useMapSidebar()
  const panelId = useId()
  const titleId = `${panelId}-title`

  if (!active) {
    return null
  }

  return (
    <aside
      id={panelId}
      className={`map-right-sidebar${isOpen ? ' is-open' : ''}`}
      aria-hidden={!isOpen}
      aria-labelledby={titleId}
    >
      <div className="map-right-sidebar-inner">
        <header className="map-right-sidebar-header">
          <span id={titleId} className="map-right-sidebar-header-title">
            {mapTitle}
          </span>
          <span className="map-right-sidebar-header-hint">
            Customers · suppliers · flows
          </span>
        </header>
        <div className="map-right-sidebar-map">
          {isOpen ? <SupplierNetworkMap /> : null}
        </div>
      </div>
    </aside>
  )
}
