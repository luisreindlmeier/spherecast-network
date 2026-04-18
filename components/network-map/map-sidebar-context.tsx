'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type MapSidebarContextValue = {
  /** A sourcing page registered the map scope */
  active: boolean
  isOpen: boolean
  mapTitle: string
  enable: (title: string) => void
  disable: () => void
  toggle: () => void
  setOpen: (open: boolean) => void
}

const MapSidebarContext = createContext<MapSidebarContextValue | null>(null)

export function MapSidebarProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [mapTitle, setMapTitle] = useState('Supplier network')

  const enable = useCallback((title: string) => {
    setMapTitle(title)
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

  const value = useMemo<MapSidebarContextValue>(
    () => ({
      active,
      isOpen,
      mapTitle,
      enable,
      disable,
      toggle,
      setOpen,
    }),
    [active, isOpen, mapTitle, enable, disable, toggle, setOpen]
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
