import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'

export const COMPANY_SCOPE_COOKIE = 'spherecast_company_scope'

/**
 * Returns the active company filter from the cookie, only if that company exists.
 */
export async function resolveCompanyScopeFilter(): Promise<number | null> {
  const store = await cookies()
  const raw = store.get(COMPANY_SCOPE_COOKIE)?.value
  if (raw === undefined || raw === '') return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return null

  const db = createServerClient()
  const { data, error } = await db
    .from('company')
    .select('id')
    .eq('id', n)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null ? n : null
}
