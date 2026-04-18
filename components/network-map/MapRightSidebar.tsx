'use client'

import dynamic from 'next/dynamic'
import { useCallback, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import { useMapSidebar } from '@/components/network-map/map-sidebar-context'
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

/** Full-viewport-height right rail; width persisted in localStorage. */
export default function MapRightSidebar() {
  const { active, isOpen, sidebarWidthPx, setSidebarWidthPx } = useMapSidebar()
  const [isResizing, setIsResizing] = useState(false)
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  const pendingWidthRef = useRef(sidebarWidthPx)

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isOpen) {
        return
      }
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startW: sidebarWidthPx }
      pendingWidthRef.current = sidebarWidthPx
      setIsResizing(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [isOpen, sidebarWidthPx]
  )

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d) {
        return
      }
      /* Left-edge splitter: drag left → wider map, drag right → narrower map */
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
      className={`map-right-sidebar${isOpen ? ' is-open' : ''}`}
      style={{
        width: isOpen ? sidebarWidthPx : 0,
        transition: isResizing ? 'none' : 'width 0.22s ease',
      }}
      aria-hidden={!isOpen}
      aria-label={isOpen ? 'Supplier network map' : undefined}
    >
      {isOpen ? (
        <div
          className="map-right-sidebar-resize-handle"
          title="Drag to resize map panel"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize map panel — drag horizontally"
        >
          <span className="map-right-sidebar-resize-grip" aria-hidden>
            <GripVertical size={14} strokeWidth={2} />
          </span>
        </div>
      ) : null}
      <div className="map-right-sidebar-inner">
        <div className="map-right-sidebar-map">
          {isOpen ? <SupplierNetworkMap /> : null}
        </div>
      </div>
    </aside>
  )
}
