import { agnesPost, proxyResponse } from '@/lib/agnes-server'

export async function POST(req: Request) {
  const body = await req.json()
  const res = await agnesPost('/recommend', body)
  return proxyResponse(res)
}
