import { agnesGet, proxyResponse } from '@/lib/agnes-server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await agnesGet(`/companies/${id}/detail`)
  return proxyResponse(res)
}
