import { agnesGet, proxyResponse } from '@/lib/agnes-server'

export async function GET() {
  const res = await agnesGet('/consolidation/direct')
  return proxyResponse(res)
}
