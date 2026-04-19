import { agnesGet, proxyResponse } from '@/lib/agnes-server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const res = await agnesGet('/raw-materials', searchParams)
  return proxyResponse(res)
}
