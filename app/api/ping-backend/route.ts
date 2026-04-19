import { agnesGet } from '@/lib/agnes-server'

export async function GET() {
  await agnesGet('/')
  return new Response('ok')
}
