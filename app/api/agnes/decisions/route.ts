import { agnesGet, agnesPost, proxyResponse } from '@/lib/agnes-server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const p = new URLSearchParams()
  const scopeCompanyId = searchParams.get('scope_company_id')
  const entityType = searchParams.get('entity_type')
  const limit = searchParams.get('limit')
  if (scopeCompanyId) p.set('scope_company_id', scopeCompanyId)
  if (entityType) p.set('entity_type', entityType)
  if (limit) p.set('limit', limit)
  const res = await agnesGet('/decisions', p)
  return proxyResponse(res)
}

export async function POST(req: Request) {
  const body: unknown = await req.json()
  const res = await agnesPost('/decisions', body)
  return proxyResponse(res)
}
