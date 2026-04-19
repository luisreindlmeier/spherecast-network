import { cookies } from 'next/headers'
import { agnesGet } from '@/lib/agnes-server'

export const COMPANY_SCOPE_COOKIE = 'spherecast_company_scope'

/**
 * Returns the active company filter from the cookie, only if that company exists.
 * Validates against the Agnes backend (SQLite) instead of Supabase.
 */
export async function resolveCompanyScopeFilter(): Promise<number | null> {
  const store = await cookies()
  const raw = store.get(COMPANY_SCOPE_COOKIE)?.value
  if (raw === undefined || raw === '') return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return null

  const res = await agnesGet(`/companies/${n}/detail`)
  if (!res.ok) return null
  return n
}
