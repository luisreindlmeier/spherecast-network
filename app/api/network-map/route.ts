import { NextResponse } from 'next/server'
import { agnesGet } from '@/lib/agnes-server'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'

export const revalidate = 300

export async function GET() {
  const scopeCompanyId = await resolveCompanyScopeFilter()
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  const res = await agnesGet('/network-map', p)
  if (!res.ok) {
    return NextResponse.json({ nodes: [], arcs: [] })
  }
  const json = (await res.json()) as unknown
  return NextResponse.json(json)
}
