'use client'

import { useLayoutEffect, type ReactNode } from 'react'
import { useMapSidebar } from '@/components/network-map/map-sidebar-context'

export interface PageMapDrawerProps {
  children: ReactNode
}

/**
 * Registers this route as a “map page”: enables the global right sidebar.
 * Map toggle lives in `PageHeader` via `titleActions={<MapSidebarToggle />}`.
 */
export default function PageMapDrawer({ children }: PageMapDrawerProps) {
  const { enable, disable } = useMapSidebar()

  useLayoutEffect(() => {
    enable()
    return () => {
      disable()
    }
  }, [enable, disable])

  return <>{children}</>
}
