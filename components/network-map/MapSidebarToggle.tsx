'use client'

import { Map as MapIcon, PanelRightClose } from 'lucide-react'
import { useMapSidebar } from '@/components/network-map/map-sidebar-context'

/** Renders nothing outside a registered map page scope. */
export default function MapSidebarToggle() {
  const { active, isOpen, toggle } = useMapSidebar()

  if (!active) {
    return null
  }

  return (
    <button
      type="button"
      className="btn btn-ghost map-sidebar-toggle"
      onClick={toggle}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <>
          <PanelRightClose size={15} strokeWidth={2} aria-hidden />
          <span>Hide map</span>
        </>
      ) : (
        <>
          <MapIcon size={15} strokeWidth={2} aria-hidden />
          <span>Show map</span>
        </>
      )}
    </button>
  )
}
