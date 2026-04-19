import { agnesGet, proxyResponse } from '@/lib/agnes-server'

export const revalidate = 300

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const res = await agnesGet('/network-map', searchParams)
  return proxyResponse(res)
}
