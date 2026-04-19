'use client'

import dynamic from 'next/dynamic'
import { useCallback, useRef, useState } from 'react'
import { useMapSidebar } from '@/components/network-map/map-sidebar-context'
import { useCompanyScope } from '@/lib/company-scope-context'
import { clampMapSidebarWidthPx } from '@/lib/map-sidebar-width'

const SupplierNetworkMap = dynamic(
  () => import('@/components/network-map/SupplierNetworkMap'),
  {
    ssr: false,
    loading: () => (
      <div className="map-right-sidebar-map-loading">Loading map…</div>
    ),
  }
)

const IngredientSimilarityPlot = dynamic(
  () => import('@/components/similarity-map/IngredientSimilarityPlot'),
  {
    ssr: false,
    loading: () => (
      <div className="map-right-sidebar-map-loading map-right-sidebar-map-loading--plot">
        Loading 3D map…
      </div>
    ),
  }
)

function panelAriaLabel(panel: 'off' | 'network' | 'similarity'): string {
  if (panel === 'network') return 'Supplier network map'
  if (panel === 'similarity') return 'Ingredient similarity map'
  return ''
}

/** Full-viewport-height right rail; width persisted in localStorage. */
export default function MapRightSidebar() {
  const { companyId } = useCompanyScope()
  const { active, panel, isPanelOpen, sidebarWidthPx, setSidebarWidthPx } =
    useMapSidebar()
  const [isResizing, setIsResizing] = useState(false)
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  const pendingWidthRef = useRef(sidebarWidthPx)

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanelOpen) {
        return
      }
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startW: sidebarWidthPx }
      pendingWidthRef.current = sidebarWidthPx
      setIsResizing(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [isPanelOpen, sidebarWidthPx]
  )

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d) {
        return
      }
      /* Left edge of map: drag left → wider panel, drag right → narrower */
      const next = clampMapSidebarWidthPx(d.startW - (e.clientX - d.startX))
      pendingWidthRef.current = next
      setSidebarWidthPx(next, false)
    },
    [setSidebarWidthPx]
  )

  const endResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const had = dragRef.current !== null
      dragRef.current = null
      setIsResizing(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      if (had) {
        setSidebarWidthPx(pendingWidthRef.current, true)
      }
    },
    [setSidebarWidthPx]
  )

  if (!active) {
    return null
  }

  return (
    <aside
      className={`map-right-sidebar${isPanelOpen ? ' is-open' : ''}`}
      style={{
        width: isPanelOpen ? sidebarWidthPx : 0,
        transition: isResizing ? 'none' : 'width 0.22s ease',
      }}
      aria-hidden={isPanelOpen ? 'false' : 'true'}
      aria-label={isPanelOpen ? panelAriaLabel(panel) : undefined}
    >
      <div
        className={`map-right-sidebar-inner${isPanelOpen ? ' app-main-chrome-bg' : ''}`}
      >
        <div className="map-right-sidebar-map">
          {isPanelOpen ? (
            <>
              <div
                className="map-right-sidebar-map-resize-edge"
                title="Drag the left edge of the map to resize the panel"
                onPointerDown={onResizePointerDown}
                onPointerMove={onResizePointerMove}
                onPointerUp={endResize}
                onPointerCancel={endResize}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize map panel"
              />
              {panel === 'network' ? (
                <SupplierNetworkMap
                  key={companyId ?? 'all'}
                  companyId={companyId}
                />
              ) : (
                <div className="map-right-sidebar-similarity">
                  <IngredientSimilarityPlot key={companyId ?? 'all'} />
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
