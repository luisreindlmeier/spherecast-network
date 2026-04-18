'use client'

import { useLayoutEffect, type ReactNode } from 'react'
import { useMapSidebar } from '@/components/network-map/map-sidebar-context'

export interface PageMapDrawerProps {
  children: ReactNode
  /** Shown in the right sidebar header */
  mapTitle?: string
}

/**
 * Registers this route as a “map page”: enables the global right sidebar
 * and its header title. Map toggle lives in `PageHeader` via
 * `titleActions={<MapSidebarToggle />}`.
 */
export default function PageMapDrawer({
  children,
  mapTitle = 'Supplier network',
}: PageMapDrawerProps) {
  const { enable, disable } = useMapSidebar()

  useLayoutEffect(() => {
    enable(mapTitle)
    return () => {
      disable()
    }
  }, [mapTitle, enable, disable])

  return <>{children}</>
}
