'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clampMapSidebarWidthPx,
  readMapSidebarWidthPx,
  writeMapSidebarWidthPx,
  MAP_SIDEBAR_DEFAULT_PX,
} from '@/lib/map-sidebar-width'

export type MapSidebarContextValue = {
  /** A sourcing page registered the map scope */
  active: boolean
  isOpen: boolean
  sidebarWidthPx: number
  /** When `persist` is false (e.g. while dragging), width updates only in memory. */
  setSidebarWidthPx: (width: number, persist?: boolean) => void
  enable: () => void
  disable: () => void
  toggle: () => void
  setOpen: (open: boolean) => void
}

const MapSidebarContext = createContext<MapSidebarContextValue | null>(null)

export function MapSidebarProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [sidebarWidthPx, setSidebarWidthPxState] = useState(
    MAP_SIDEBAR_DEFAULT_PX
  )

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setSidebarWidthPxState(readMapSidebarWidthPx())
    })
    return () => window.cancelAnimationFrame(id)
  }, [])

  const enable = useCallback(() => {
    setActive(true)
  }, [])

  const disable = useCallback(() => {
    setActive(false)
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((o) => !o)
  }, [])

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open)
  }, [])

  const setSidebarWidthPx = useCallback(
    (width: number, persist: boolean = true) => {
      const next = clampMapSidebarWidthPx(width)
      setSidebarWidthPxState(next)
      if (persist) {
        writeMapSidebarWidthPx(next)
      }
    },
    []
  )

  const value = useMemo<MapSidebarContextValue>(
    () => ({
      active,
      isOpen,
      sidebarWidthPx,
      setSidebarWidthPx,
      enable,
      disable,
      toggle,
      setOpen,
    }),
    [
      active,
      isOpen,
      sidebarWidthPx,
      setSidebarWidthPx,
      enable,
      disable,
      toggle,
      setOpen,
    ]
  )

  return (
    <MapSidebarContext.Provider value={value}>
      {children}
    </MapSidebarContext.Provider>
  )
}

export function useMapSidebar(): MapSidebarContextValue {
  const ctx = useContext(MapSidebarContext)
  if (!ctx) {
    throw new Error('useMapSidebar must be used within MapSidebarProvider')
  }
  return ctx
}
