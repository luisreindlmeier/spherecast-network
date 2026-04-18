'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { setCompanyScopeAction } from '@/app/actions/company-scope'
import type { CompanyPickerRow } from '@/lib/queries'

interface CompanyScopeContextValue {
  companyId: number | null
  setCompanyId: (id: number | null) => Promise<void>
  companies: CompanyPickerRow[]
}

const CompanyScopeContext = createContext<CompanyScopeContextValue | null>(null)

export function CompanyScopeProvider({
  children,
  companies,
  initialCompanyId,
}: {
  children: ReactNode
  companies: CompanyPickerRow[]
  initialCompanyId: number | null
}) {
  const router = useRouter()
  const [companyId, setCompanyIdState] = useState<number | null>(
    initialCompanyId
  )

  const setCompanyId = useCallback(
    async (id: number | null) => {
      setCompanyIdState(id)
      await setCompanyScopeAction(id === null ? 'all' : String(id))
      router.refresh()
    },
    [router]
  )

  const value = useMemo(
    () => ({
      companyId,
      setCompanyId,
      companies,
    }),
    [companyId, setCompanyId, companies]
  )

  return (
    <CompanyScopeContext.Provider value={value}>
      {children}
    </CompanyScopeContext.Provider>
  )
}

export function useCompanyScope() {
  const ctx = useContext(CompanyScopeContext)
  if (!ctx)
    throw new Error('useCompanyScope must be used within CompanyScopeProvider')
  return ctx
}
