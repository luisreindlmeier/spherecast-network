const AGNES_URL = process.env.AGNES_API_URL ?? 'http://localhost:8000'
const AGNES_KEY = process.env.AGNES_API_KEY ?? ''

export async function agnesGet(path: string, params?: URLSearchParams): Promise<Response> {
  const url = `${AGNES_URL}${path}${params?.toString() ? `?${params}` : ''}`
  return fetch(url, {
    headers: { 'X-API-Key': AGNES_KEY },
    next: { revalidate: 0 },
  })
}

export async function agnesPost(path: string, body: unknown): Promise<Response> {
  return fetch(`${AGNES_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': AGNES_KEY },
    body: JSON.stringify(body),
  })
}

export function proxyResponse(res: Response): Response {
  if (!res.ok) return new Response(JSON.stringify({ error: 'Agnes unavailable' }), { status: res.status, headers: { 'Content-Type': 'application/json' } })
  return res
}
