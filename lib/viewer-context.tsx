'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export type ViewerRole = 'customer' | 'spherecast'

export interface Viewer {
  role: ViewerRole
  orgName: string
  userName: string
  initials: string
}

const CUSTOMER_VIEWER: Viewer = {
  role: 'customer',
  orgName: 'NOW Foods',
  userName: 'Sarah Chen',
  initials: 'SC',
}

const SPHERECAST_VIEWER: Viewer = {
  role: 'spherecast',
  orgName: 'Spherecast',
  userName: 'Admin',
  initials: 'SP',
}

interface ViewerContextValue {
  viewer: Viewer
  setRole: (role: ViewerRole) => void
  toggle: () => void
}

const ViewerContext = createContext<ViewerContextValue | null>(null)

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<Viewer>(CUSTOMER_VIEWER)

  const setRole = (role: ViewerRole) => {
    setViewer(role === 'spherecast' ? SPHERECAST_VIEWER : CUSTOMER_VIEWER)
  }

  const toggle = () => {
    setViewer((v) =>
      v.role === 'customer' ? SPHERECAST_VIEWER : CUSTOMER_VIEWER
    )
  }

  return (
    <ViewerContext.Provider value={{ viewer, setRole, toggle }}>
      {children}
    </ViewerContext.Provider>
  )
}

export function useViewer() {
  const ctx = useContext(ViewerContext)
  if (!ctx) throw new Error('useViewer must be used within ViewerProvider')
  return ctx
}
