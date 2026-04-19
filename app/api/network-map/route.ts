import { NextResponse } from 'next/server'
import { agnesGet } from '@/lib/agnes-server'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'

export const revalidate = 300

export async function GET() {
  const scopeCompanyId = await resolveCompanyScopeFilter()
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  const res = await agnesGet('/network-map', p)
  if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: 502 })
  return NextResponse.json(await res.json())
}
