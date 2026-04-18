'use client'

import dynamic from 'next/dynamic'
import { useCallback, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, Map as MapIcon } from 'lucide-react'

const SupplierNetworkMap = dynamic(
  () => import('@/components/network-map/SupplierNetworkMap'),
  {
    ssr: false,
    loading: () => (
      <div className="page-map-drawer-map-loading">Loading map…</div>
    ),
  }
)

export interface PageMapDrawerProps {
  children: ReactNode
  /** Drawer header title */
  mapTitle?: string
}

export default function PageMapDrawer({
  children,
  mapTitle = 'Supplier network',
}: PageMapDrawerProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const toggleId = `${panelId}-toggle`
  const titleId = `${panelId}-title`

  const toggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  return (
    <div
      className="page-map-drawer-layout"
      data-drawer-open={open ? 'true' : 'false'}
    >
      <div className="page-map-drawer-main">{children}</div>
      <div className="page-map-drawer-rail">
        <button
          id={toggleId}
          type="button"
          className="page-map-drawer-toggle"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
        >
          {open ? (
            <>
              <ChevronLeft size={16} strokeWidth={2} aria-hidden />
              <span className="page-map-drawer-toggle-text">Hide</span>
            </>
          ) : (
            <>
              <MapIcon size={16} strokeWidth={2} aria-hidden />
              <span className="page-map-drawer-toggle-text">Map</span>
            </>
          )}
        </button>
      </div>
      <aside
        id={panelId}
        className={`page-map-drawer-panel${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        aria-labelledby={titleId}
      >
        <div className="page-map-drawer-panel-inner">
          <header className="page-map-drawer-header">
            <span id={titleId} className="page-map-drawer-header-title">
              {mapTitle}
            </span>
            <span className="page-map-drawer-header-hint">
              Customers · suppliers · flows
            </span>
          </header>
          <div className="page-map-drawer-map">
            {open ? <SupplierNetworkMap /> : null}
          </div>
        </div>
      </aside>
    </div>
  )
}
