import { agnesGet, proxyResponse } from '@/lib/agnes-server'

export const revalidate = 300

export async function GET() {
  const res = await agnesGet('/network-map')
  return proxyResponse(res)
}
