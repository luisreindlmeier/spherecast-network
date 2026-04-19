const AGNES_URL = process.env.AGNES_API_URL ?? 'http://127.0.0.1:8000'
const AGNES_KEY = process.env.AGNES_API_KEY ?? ''

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function safeFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error'
    console.error(`[agnes] upstream fetch failed for ${input}: ${message}`)
    return new Response(
      JSON.stringify({ error: 'Agnes unavailable', detail: message }),
      { status: 503, headers: JSON_HEADERS },
    )
  }
}

export async function agnesGet(path: string, params?: URLSearchParams): Promise<Response> {
  const url = `${AGNES_URL}${path}${params?.toString() ? `?${params}` : ''}`
  return safeFetch(url, {
    headers: { 'X-API-Key': AGNES_KEY },
    next: { revalidate: 0 },
  })
}

export async function agnesPost(path: string, body: unknown): Promise<Response> {
  return safeFetch(`${AGNES_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': AGNES_KEY },
    body: JSON.stringify(body),
  })
}

export function proxyResponse(res: Response): Response {
  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: 'Agnes unavailable' }),
      { status: res.status, headers: JSON_HEADERS },
    )
  }
  return res
}
